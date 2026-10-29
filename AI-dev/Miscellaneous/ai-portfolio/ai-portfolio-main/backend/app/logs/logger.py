import logging
import sys
from functools import lru_cache

FORMATTER = logging.Formatter("%(asctime)s - %(levelname)s - %(name)s - %(message)s")

@lru_cache(maxsize=None)
def get_console_handler() -> logging.StreamHandler:
    """Configure and cache console logging handler"""
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(FORMATTER)
    return console_handler

def get_logger(logger_name: str) -> logging.Logger:
    logger = logging.getLogger(logger_name)
    logger.setLevel(logging.DEBUG)
    
    if not logger.handlers:
        logger.addHandler(get_console_handler())
    
    logger.propagate = False
    return logger

