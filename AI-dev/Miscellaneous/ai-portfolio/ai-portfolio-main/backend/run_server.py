import os
from app import factory
from app.controllers.chat_router import ChatRouter
from app.logs.logger import get_logger
from app.startup.documents.init_documents import init_documents
from dotenv import load_dotenv
import uvicorn
import asyncio

logger = get_logger(__name__)

async def initialize_services():
    """Initialize all required services and data"""
    document_indexer = factory.document_indexer()
    db_handler = factory.database_handler()
    await init_documents(document_indexer, db_handler)

async def create_application():
    """Create and configure the FastAPI application"""
    app = factory.create_app()
    chat_service = factory.chat_service()
    router = ChatRouter(chat_service=chat_service)
    app.include_router(router=router.router)
    
    return app

async def run_server():
    """Main function to start the server"""
    load_dotenv()
    
    app = await create_application()
    await initialize_services()
    
    logger.info("Starting the server")
    config = uvicorn.Config(
        app=app,
        host=os.getenv("UVICORN_IP"),
        port=int(os.getenv("UVICORN_PORT"))
    )
    server = uvicorn.Server(config)
    await server.serve()

if __name__ == '__main__':
    asyncio.run(run_server())
