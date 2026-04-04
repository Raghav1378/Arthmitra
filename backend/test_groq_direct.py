import os
import json
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv

load_dotenv(override=True)
if not os.getenv("GROQ_API_KEY"):
    parent_env = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(parent_env):
        load_dotenv(parent_env, override=True)

def test_groq_direct():
    print("Testing Groq Direct Connection...")
    try:
        llm = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0.3,
            api_key=os.getenv("GROQ_API_KEY")
        )
        payload = {
            "message": "Calculate the EMI for 10 Lakhs at 8% for 5 years",
            "user_id": "test_user",
            "is_local_only": False,
            "agent": None
        }
        
        # In the real app, this goes through the router
        # We'll simulate the auditor node logic as it would be triggered by 'EMI'/'Calculate'
        
        prompt = f"User Request: {payload['message']}\n\nYou are the Auditor agent. Calculate the EMI and provide a clear breakdown."
        
        response = llm.invoke([HumanMessage(content=prompt)])
        print("\n--- Groq Response ---")
        print(response.content)
        print("---------------------\n")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    test_groq_direct()
