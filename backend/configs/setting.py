from pydantic_settings import BaseSettings
from pydantic import Field
class Settings(BaseSettings):
    model_name: dict= Field(...,env="MODEL_NAME")
    class Config:
        env_file=".env"
        env_file_encoding="utf-8"  
    
settings=Settings()