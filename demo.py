import requests

API_KEY = "sk-IXr1EJ7CsYTLD1nAlSqS8ZxekajeMjQSN9SaihVYlZG6tWt9"

url = "https://agentrouter.org/v1/models"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}

response = requests.get(url, headers=headers)

print("STATUS:", response.status_code)
print("RESPONSE:")
print(response.text)