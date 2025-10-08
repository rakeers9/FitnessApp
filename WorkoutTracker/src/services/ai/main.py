"""
AI Fitness Coach Agent Service
Main FastAPI application for handling agent interactions
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os
from dotenv import load_dotenv
import logging

from core.agent_orchestrator import AgentOrchestrator
from config.personalities import PersonalitySystem
from config.settings import Settings

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AI Fitness Coach Agent Service",
    description="LangGraph-powered agent system for personalized fitness coaching",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize settings
settings = Settings()

# Initialize agent system
orchestrator = AgentOrchestrator(settings)
personality_system = PersonalitySystem()

# Request/Response Models
class ChatRequest(BaseModel):
    message: str
    user_id: str
    conversation_id: Optional[str] = None
    persona: str = "calm"
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    response: str
    agent_id: str
    conversation_id: str
    intent: str
    actions: Optional[List[Dict[str, Any]]] = None
    references: Optional[Dict[str, Any]] = None

class ReadinessRequest(BaseModel):
    user_id: str
    date: Optional[str] = None

class ReadinessResponse(BaseModel):
    readiness_score: float
    components: Dict[str, float]
    recommendations: Dict[str, Any]
    adjustment: Optional[Dict[str, Any]] = None
    message: str

class PlanGenerationRequest(BaseModel):
    user_id: str
    preferences: Dict[str, Any]
    onboarding_data: Dict[str, Any]

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "service": "AI Fitness Coach Agent",
        "version": "1.0.0"
    }

# Main chat endpoint
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main conversational interface for agent interactions
    """
    try:
        logger.info(f"Chat request from user {request.user_id}: {request.message[:50]}...")

        # Get personality configuration
        personality_config = personality_system.get_persona_config(request.persona)

        # Process through orchestrator
        result = await orchestrator.process_message(
            user_id=request.user_id,
            message=request.message,
            conversation_id=request.conversation_id,
            persona_config=personality_config,
            context=request.context
        )

        logger.info(f"Successfully processed chat for user {request.user_id}")

        return ChatResponse(
            response=result["response"],
            agent_id=result["agent_id"],
            conversation_id=result["conversation_id"],
            intent=result["intent"],
            actions=result.get("actions"),
            references=result.get("references")
        )

    except Exception as e:
        logger.error(f"Error processing chat request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Daily readiness briefing endpoint
@app.post("/readiness", response_model=ReadinessResponse)
async def calculate_readiness(request: ReadinessRequest):
    """
    Calculate readiness score and generate recommendations
    """
    try:
        logger.info(f"Calculating readiness for user {request.user_id}")

        # Process through readiness agent
        result = await orchestrator.calculate_readiness(
            user_id=request.user_id,
            date=request.date
        )

        return ReadinessResponse(
            readiness_score=result["readiness_score"],
            components=result["components"],
            recommendations=result["recommendations"],
            adjustment=result.get("adjustment"),
            message=result["message"]
        )

    except Exception as e:
        logger.error(f"Error calculating readiness: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Generate training plan endpoint
@app.post("/generate-plan")
async def generate_plan(request: PlanGenerationRequest):
    """
    Generate initial training plan during onboarding
    """
    try:
        logger.info(f"Generating plan for user {request.user_id}")

        result = await orchestrator.generate_training_plan(
            user_id=request.user_id,
            preferences=request.preferences,
            onboarding_data=request.onboarding_data
        )

        return {
            "plan_id": result["plan_id"],
            "plan": result["plan"],
            "message": result["message"]
        }

    except Exception as e:
        logger.error(f"Error generating plan: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Voice transcription endpoint (for future voice feature)
@app.post("/voice/transcribe")
async def transcribe_voice(audio_data: bytes):
    """
    Transcribe voice input to text
    """
    # Placeholder for voice transcription
    return {"transcription": "Voice transcription not yet implemented"}

# Voice synthesis endpoint
@app.post("/voice/synthesize")
async def synthesize_voice(text: str, persona: str = "calm"):
    """
    Convert text to speech with persona-specific voice
    """
    # Placeholder for voice synthesis
    return {"audio_url": "Voice synthesis not yet implemented"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)