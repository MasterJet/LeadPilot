import os
from openai import OpenAI
import json
from models.models import Lead
import logging

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self, api_key: str = None, provider: str = "openai"):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.provider = provider.lower() if provider else "openai"
        self.client = OpenAI(api_key=self.api_key) if self.provider == "openai" and self.api_key else None

    def generate_outreach(self, lead: Lead, custom_instructions: str = None):
        if self.api_key:
            if self.provider == "openai" and self.client:
                return self._generate_with_ai(lead, custom_instructions)
            elif self.provider == "gemini":
                return self._generate_with_gemini(lead, custom_instructions)
        return self._generate_with_template(lead)

    def _get_prompt(self, lead: Lead, custom_instructions: str = None):
        base_prompt = f"""
        Generate a short, high-converting outreach message for a business.
        Business Name: {lead.name}
        Niche: {lead.niche}
        Location: {lead.location}
        Analysis:
        - Has Website: {bool(lead.website)}
        - Has Chatbot: {lead.has_chatbot}
        - Has WhatsApp: {lead.has_whatsapp}
        - Has Booking System: {lead.has_booking_system}
        - CMS: {lead.cms_name or 'Unknown'}
        
        Guidelines:
        - Keep it under 3 lines.
        - Mention a specific gap (e.g. "I noticed you don't have an automated booking system").
        - End with a clear call to action (e.g. "Want a quick demo?").
        - Tone: Professional, helpful, not spammy.
        """
        if custom_instructions:
            base_prompt += f"\n\nAdditional Custom Instructions:\n{custom_instructions}\nStrictly follow these."
        return base_prompt

    def _generate_with_gemini(self, lead: Lead, custom_instructions: str = None):
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key.strip())
            model = genai.GenerativeModel('gemini-flash-latest')
            prompt = self._get_prompt(lead, custom_instructions)
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini Generation failed: {e}")
            return self._generate_with_template(lead)

    def _generate_with_ai(self, lead: Lead, custom_instructions: str = None):
        try:
            prompt = self._get_prompt(lead, custom_instructions)
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}]
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"AI Generation failed: {e}")
            return self._generate_with_template(lead)

    def _generate_with_template(self, lead: Lead):
        if not lead.website:
            return f"Hi {lead.name}, I noticed you don't have a professional website yet. We help {lead.niche} businesses in {lead.location} build high-converting sites that book clients automatically. Want to see a demo?"
        if not lead.has_chatbot:
            return f"Hi {lead.name}, I noticed your website doesn't respond instantly to inquiries. We built an AI system for {lead.niche} businesses that replies and books appointments 24/7. Interested?"
        if not lead.has_whatsapp:
            return f"Hi {lead.name}, I saw your great reviews! We help clinics add a WhatsApp booking link to increase bookings by 30%. Want a quick demo?"
        return f"Hi {lead.name}, we help {lead.niche} businesses in {lead.location} automate their sales process. Open to a 5-minute demo this week?"

    def generate_macro_locations(self, prompt: str, previously_searched: list = None):
        system_prompt = """You are an AI data gathering assistant. The user will give you a lead generation objective.
Your job is to extract the niche, the target amount, and generate a JSON array of specific cities/locations to search.
A single Google Maps search yields about 100-150 results. Break this down into a smart list of high-density cities to search.
You MUST obey any exclusions the user mentions.
Also, avoid the cities in the 'previously_searched' list if provided.

Return ONLY valid JSON in this exact format, with NO markdown formatting blocks like ```json:
{
    "target": 1000,
    "niche": "Salon",
    "locations": ["Chicago, IL", "Houston, TX", "Miami, FL", "Dallas, TX", "Atlanta, GA"]
}"""
        user_prompt = f"Objective: {prompt}"
        if previously_searched:
            user_prompt += f"\nPreviously searched cities to exclude: {', '.join(previously_searched)}"
            
        full_prompt = system_prompt + "\n\n" + user_prompt
        
        try:
            if self.provider == "gemini" and self.api_key:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key.strip())
                model = genai.GenerativeModel('gemini-flash-latest')
                response = model.generate_content(full_prompt)
                res_text = response.text.strip()
            elif self.provider == "openai" and self.client:
                response = self.client.chat.completions.create(
                    model="gpt-4o",
                    messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}]
                )
                res_text = response.choices[0].message.content.strip()
            else:
                return None
                
            if res_text.startswith("```json"):
                res_text = res_text[7:-3].strip()
            elif res_text.startswith("```"):
                res_text = res_text[3:-3].strip()
                
            return json.loads(res_text)
        except Exception as e:
            logger.error(f"Failed to generate macro locations: {e}")
            return None
