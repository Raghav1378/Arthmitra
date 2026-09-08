import os
import anthropic

api_key = os.environ.get("AGENTROUTER_API_KEY")
if not api_key:
    raise SystemExit("Set the AGENTROUTER_API_KEY environment variable to run this demo.")

client = anthropic.Anthropic(api_key=api_key, base_url="https://agentrouter.org/")
message = client.messages.create(
      model="deepseek-v4-flash",
      max_tokens=1024,
      timeout=60,
      messages=[{"role": "user", "content": "Can you tell me what is momo"}])
for block in message.content:
      if block.type == "text":
          print(block.text)
      elif block.type == "thinking":
          print(f"[Thinking] {block.thinking}")
