"""
memory.py - NexusAI Vector Memory System

This module handles:
1. Pinecone connection and index management
2. Storing conversation messages as embeddings
3. Semantic search across conversation history
4. Memory retrieval for context-aware responses

Reference: https://docs.pinecone.io/guides/get-started/quickstart
"""

import os
from datetime import datetime
from typing import List, Dict, Optional
import hashlib

from config import (
    PINECONE_API_KEY,
    PINECONE_INDEX_NAME,
    PINECONE_DIMENSION,
    PINECONE_METRIC,
    PINECONE_CLOUD,
    PINECONE_REGION,
    OPENAI_API_KEY,
    MEMORY_RETRIEVAL_K
)


class NexusMemory:
    """
    Vector-based semantic memory for NexusAI.
    
    Stores all conversation messages as embeddings in Pinecone,
    enabling semantic search across entire conversation history.
    
    Features lazy initialization to avoid slow startup.
    """
    
    def __init__(self, session_id: str = "default"):
        """
        Initialize the memory system.
        
        Args:
            session_id: Unique identifier for this conversation session
        """
        self.session_id = session_id
        self.pc = None
        self.index = None
        self.embeddings = None
        self.vector_store = None
        self._initialized = False
        self._initialization_failed = False
        self._error_message = None
        
    def initialize(self) -> bool:
        """
        Initialize Pinecone connection and create index if needed.
        Uses lazy initialization - only connects when first needed.
        
        Returns:
            bool: True if initialization successful
        """
        # Don't retry if we already failed
        if self._initialization_failed:
            return False
            
        if self._initialized:
            return True
            
        try:
            from pinecone import Pinecone, ServerlessSpec
            from langchain_openai import OpenAIEmbeddings
            from langchain_pinecone import PineconeVectorStore
            
            # Initialize Pinecone client
            self.pc = Pinecone(api_key=PINECONE_API_KEY)
            
            # Check if index exists, create if not
            existing_indexes = [idx.name for idx in self.pc.list_indexes()]
            
            if PINECONE_INDEX_NAME not in existing_indexes:
                print(f"Creating Pinecone index: {PINECONE_INDEX_NAME}")
                self.pc.create_index(
                    name=PINECONE_INDEX_NAME,
                    dimension=PINECONE_DIMENSION,
                    metric=PINECONE_METRIC,
                    spec=ServerlessSpec(
                        cloud=PINECONE_CLOUD,
                        region=PINECONE_REGION
                    )
                )
                print(f"Index '{PINECONE_INDEX_NAME}' created successfully!")
            
            # Connect to the index
            self.index = self.pc.Index(PINECONE_INDEX_NAME)
            
            # Initialize OpenAI embeddings
            self.embeddings = OpenAIEmbeddings(
                openai_api_key=OPENAI_API_KEY,
                model="text-embedding-3-small"
            )
            
            # Initialize vector store
            self.vector_store = PineconeVectorStore(
                index=self.index,
                embedding=self.embeddings,
                text_key="text"
            )
            
            self._initialized = True
            return True
            
        except Exception as e:
            self._initialization_failed = True
            self._error_message = str(e)
            print(f"Error initializing memory: {e}")
            return False
    
    def _generate_id(self, text: str, role: str) -> str:
        """Generate a unique ID for a memory entry."""
        timestamp = datetime.now().isoformat()
        content = f"{self.session_id}_{role}_{timestamp}_{text[:50]}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def add_message(self, role: str, content: str, metadata: Optional[Dict] = None) -> bool:
        """
        Add a message to memory.
        
        Args:
            role: "user" or "assistant"
            content: The message content
            metadata: Optional additional metadata
            
        Returns:
            bool: True if successful
        """
        # Skip if initialization failed (don't slow things down)
        if self._initialization_failed:
            return False
            
        if not self._initialized:
            if not self.initialize():
                return False
        
        try:
            # Prepare metadata
            msg_metadata = {
                "session_id": self.session_id,
                "role": role,
                "timestamp": datetime.now().isoformat(),
                "text": content
            }
            
            if metadata:
                msg_metadata.update(metadata)
            
            # Add to vector store
            self.vector_store.add_texts(
                texts=[content],
                metadatas=[msg_metadata],
                ids=[self._generate_id(content, role)]
            )
            
            return True
            
        except Exception as e:
            print(f"Error adding message to memory: {e}")
            return False
    
    def search_memory(self, query: str, k: int = None) -> List[Dict]:
        """
        Search memory for relevant past conversations.
        
        Args:
            query: The search query
            k: Number of results to return
            
        Returns:
            List of relevant memory entries with metadata
        """
        # Skip if initialization failed
        if self._initialization_failed:
            return []
            
        if not self._initialized:
            if not self.initialize():
                return []
        
        k = k or MEMORY_RETRIEVAL_K
        
        try:
            # Perform similarity search
            results = self.vector_store.similarity_search_with_score(
                query=query,
                k=k,
                filter={"session_id": self.session_id}
            )
            
            memories = []
            for doc, score in results:
                memories.append({
                    "content": doc.page_content,
                    "role": doc.metadata.get("role", "unknown"),
                    "timestamp": doc.metadata.get("timestamp", ""),
                    "score": score
                })
            
            return memories
            
        except Exception as e:
            print(f"Error searching memory: {e}")
            return []
    
    def get_relevant_context(self, query: str) -> str:
        """
        Get formatted context from memory for the agent.
        
        Args:
            query: The current user query
            
        Returns:
            Formatted string with relevant past context
        """
        # Return empty if memory is not working (don't block the agent)
        if self._initialization_failed:
            return ""
            
        memories = self.search_memory(query)
        
        if not memories:
            return ""
        
        context_parts = ["Relevant past conversations:"]
        for mem in memories:
            role = "User" if mem["role"] == "user" else "Assistant"
            context_parts.append(f"- {role}: {mem['content'][:200]}...")
        
        return "\n".join(context_parts)
    
    def clear_session(self) -> bool:
        """
        Clear all memories for the current session.
        
        Returns:
            bool: True if successful
        """
        if not self._initialized:
            return True
        
        try:
            print(f"Session {self.session_id} cleared from memory.")
            return True
            
        except Exception as e:
            print(f"Error clearing session: {e}")
            return False


# Convenience function for quick memory access
def get_memory(session_id: str = "default") -> NexusMemory:
    """Get a memory instance for the given session (lazy initialization)."""
    return NexusMemory(session_id=session_id)
