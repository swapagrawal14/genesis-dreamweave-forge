
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, Download, Copy, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface GeneratedConcept {
  name: string;
  description: string;
  characteristics: string[];
  loreSnippet: string;
  imageData: string;
}

const Index = () => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('genesis_api_key') || '');
  const [conceptType, setConceptType] = useState('');
  const [seedIdea, setSeedIdea] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedConcept, setGeneratedConcept] = useState<GeneratedConcept | null>(null);
  const [currentStep, setCurrentStep] = useState('');

  const conceptTypes = [
    'Alien Species',
    'Fantasy World',
    'Magical Artifact',
    'Mythical Location',
    'Fictional Creature',
    'Ancient Civilization',
    'Mystical Phenomenon',
    'Legendary Vehicle'
  ];

  const saveApiKey = (key: string) => {
    localStorage.setItem('genesis_api_key', key);
    setApiKey(key);
  };

  const parseAIResponse = (response: string): Partial<GeneratedConcept> => {
    console.log('Parsing AI response:', response);
    
    const sections = {
      name: '',
      description: '',
      characteristics: [] as string[],
      loreSnippet: ''
    };

    // Extract NAME
    const nameMatch = response.match(/\*\*NAME:\*\*\s*(.*?)(?=\n|\*\*|$)/i) || 
                     response.match(/NAME:\s*(.*?)(?=\n|[A-Z]+:|$)/i);
    if (nameMatch) {
      sections.name = nameMatch[1].trim().replace(/^["']|["']$/g, '');
    }

    // Extract CORE DESCRIPTION
    const descMatch = response.match(/\*\*CORE DESCRIPTION:\*\*\s*([\s\S]*?)(?=\*\*[A-Z]|\n\n|$)/i) ||
                     response.match(/CORE DESCRIPTION:\s*([\s\S]*?)(?=[A-Z]+:|$)/i);
    if (descMatch) {
      sections.description = descMatch[1].trim();
    }

    // Extract KEY CHARACTERISTICS
    const charMatch = response.match(/\*\*KEY CHARACTERISTICS[^:]*:\*\*\s*([\s\S]*?)(?=\*\*[A-Z]|\n\n|$)/i) ||
                     response.match(/KEY CHARACTERISTICS[^:]*:\s*([\s\S]*?)(?=[A-Z]+:|$)/i);
    if (charMatch) {
      const charText = charMatch[1].trim();
      sections.characteristics = charText
        .split(/\n/)
        .map(line => line.replace(/^[-*•]\s*/, '').trim())
        .filter(line => line.length > 0);
    }

    // Extract LORE SNIPPET
    const loreMatch = response.match(/\*\*LORE SNIPPET[^:]*:\*\*\s*([\s\S]*?)$/i) ||
                     response.match(/LORE SNIPPET[^:]*:\s*([\s\S]*?)$/i) ||
                     response.match(/\*\*DISCOVERY LOG[^:]*:\*\*\s*([\s\S]*?)$/i) ||
                     response.match(/DISCOVERY LOG[^:]*:\s*([\s\S]*?)$/i);
    if (loreMatch) {
      sections.loreSnippet = loreMatch[1].trim();
    }

    console.log('Parsed sections:', sections);
    return sections;
  };

  const generateTextContent = async (): Promise<Partial<GeneratedConcept>> => {
    const prompt = `You are a master world-builder and lore writer for a grand fantasy/sci-fi universe. A user wants to create a new ${conceptType} based on the seed concept: '${seedIdea}'.

Generate the following, clearly labeling each section:

**NAME:** Propose 1-2 creative names for this ${conceptType}.

**CORE DESCRIPTION:** A detailed paragraph (3-5 sentences) describing its essence, appearance, and general nature.

**KEY CHARACTERISTICS/FEATURES:** A bulleted list of 3-5 defining traits, abilities, environmental factors, or unique properties.

**LORE SNIPPET / DISCOVERY LOG:** A short, imaginative piece of narrative text (4-6 sentences) written as if it's an excerpt from a field guide, explorer's journal, historical text, or a research log entry about this ${conceptType}. This snippet should hint at its mystery, history, or impact.

Ensure the tone is fitting for creative world-building (imaginative, slightly formal but engaging).`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Text generation failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Text API response:', data);
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response structure from text API');
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    return parseAIResponse(generatedText);
  };

  const generateImage = async (textContent: Partial<GeneratedConcept>): Promise<string> => {
    const imagePrompt = `Concept art for a ${conceptType} named '${textContent.name}'. ${textContent.description} Key visual features include: ${textContent.characteristics?.join(', ')}. The overall mood should be mysterious and epic. Digital painting, detailed, epic fantasy/sci-fi art style, high quality concept art.`;

    console.log('Image generation prompt:', imagePrompt);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: imagePrompt }]
        }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"]
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Image generation failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Image API response:', data);

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
      throw new Error('Invalid response structure from image API');
    }

    // Find the image part in the response
    const imagePart = data.candidates[0].content.parts.find((part: any) => part.inlineData && part.inlineData.data);
    if (!imagePart) {
      throw new Error('No image data found in response');
    }

    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
  };

  const handleGenerate = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter your Google API key');
      return;
    }

    if (!conceptType || !seedIdea.trim()) {
      toast.error('Please select a concept type and enter your seed idea');
      return;
    }

    setIsGenerating(true);
    setCurrentStep('Weaving the lore...');
    setGeneratedConcept(null);

    try {
      // Step 1: Generate text content
      const textContent = await generateTextContent();
      console.log('Generated text content:', textContent);

      if (!textContent.name || !textContent.description) {
        throw new Error('Failed to generate complete text content');
      }

      // Step 2: Generate image
      setCurrentStep('Manifesting the vision...');
      const imageData = await generateImage(textContent);

      const finalConcept: GeneratedConcept = {
        name: textContent.name || 'Unnamed Entity',
        description: textContent.description || 'A mysterious entity from beyond.',
        characteristics: textContent.characteristics || [],
        loreSnippet: textContent.loreSnippet || 'Lost to the ages...',
        imageData
      };

      setGeneratedConcept(finalConcept);
      toast.success('Genesis complete! Your concept has been forged.');

    } catch (error) {
      console.error('Generation error:', error);
      toast.error(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
      setCurrentStep('');
    }
  };

  const downloadImage = () => {
    if (!generatedConcept?.imageData) return;
    
    const link = document.createElement('a');
    link.href = generatedConcept.imageData;
    link.download = `${generatedConcept.name.replace(/\s+/g, '_')}_concept_art.png`;
    link.click();
  };

  const copyToClipboard = () => {
    if (!generatedConcept) return;
    
    const text = `**${generatedConcept.name}**

${generatedConcept.description}

**Key Characteristics:**
${generatedConcept.characteristics.map(char => `• ${char}`).join('\n')}

**Discovery Log:**
${generatedConcept.loreSnippet}`;

    navigator.clipboard.writeText(text);
    toast.success('Concept details copied to clipboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 text-white">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-yellow-400" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 via-purple-300 to-blue-300 bg-clip-text text-transparent">
              AI Genesis Engine
            </h1>
            <Sparkles className="w-8 h-8 text-yellow-400" />
          </div>
          <p className="text-xl text-purple-200 max-w-2xl mx-auto">
            Forge new worlds, beings, and artifacts from the essence of imagination. 
            Enter your vision and watch as the Genesis Engine breathes life into your concepts.
          </p>
        </div>

        {/* API Key Input */}
        <Card className="mb-8 bg-slate-800/50 border-purple-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-yellow-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Genesis Key Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Input
                type="password"
                placeholder="Enter your Google API Key to unlock the Genesis Engine..."
                value={apiKey}
                onChange={(e) => saveApiKey(e.target.value)}
                className="bg-slate-700/50 border-purple-400/30 text-white placeholder-gray-400"
              />
              <p className="text-sm text-gray-400">
                Your API key is stored locally and never shared. Required for both text and image generation.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Input Section */}
        <Card className="mb-8 bg-slate-800/50 border-purple-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-purple-300">Genesis Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Concept Type
              </label>
              <Select value={conceptType} onValueChange={setConceptType}>
                <SelectTrigger className="bg-slate-700/50 border-purple-400/30 text-white">
                  <SelectValue placeholder="Choose what you wish to create..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-purple-500/30">
                  {conceptTypes.map((type) => (
                    <SelectItem key={type} value={type} className="text-white hover:bg-purple-600/20">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Seed Idea / Keywords
              </label>
              <Textarea
                placeholder="Describe your vision... (e.g., 'Floating islands held by giant chains', 'Silicon-based life form that communicates with light patterns', 'A sword forged from a fallen star')"
                value={seedIdea}
                onChange={(e) => setSeedIdea(e.target.value)}
                rows={4}
                className="bg-slate-700/50 border-purple-400/30 text-white placeholder-gray-400 resize-none"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !apiKey || !conceptType || !seedIdea}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3 text-lg transition-all duration-300 transform hover:scale-105"
            >
              {isGenerating ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {currentStep}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Generate Concept!
                  <Sparkles className="w-5 h-5" />
                </div>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Generated Content */}
        {generatedConcept && (
          <Card className="bg-slate-800/50 border-purple-500/30 backdrop-blur-sm animate-in fade-in duration-1000">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-yellow-400 text-2xl">Genesis Log Entry</CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={downloadImage}
                    variant="outline"
                    size="sm"
                    className="border-purple-400/30 text-purple-300 hover:bg-purple-600/20"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Image
                  </Button>
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    size="sm"
                    className="border-purple-400/30 text-purple-300 hover:bg-purple-600/20"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Text
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Image */}
              <div className="flex justify-center">
                <div className="relative group">
                  <img
                    src={generatedConcept.imageData}
                    alt={generatedConcept.name}
                    className="max-w-full h-auto rounded-lg shadow-2xl border border-purple-500/30 transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg pointer-events-none"></div>
                </div>
              </div>

              {/* Name */}
              <div className="text-center">
                <h2 className="text-3xl font-bold text-yellow-400 mb-2">
                  {generatedConcept.name}
                </h2>
                <div className="h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent"></div>
              </div>

              {/* Description */}
              <div className="bg-slate-700/30 rounded-lg p-6 border border-purple-500/20">
                <h3 className="text-lg font-semibold text-purple-300 mb-3">Core Description</h3>
                <p className="text-gray-200 leading-relaxed">{generatedConcept.description}</p>
              </div>

              {/* Characteristics */}
              {generatedConcept.characteristics.length > 0 && (
                <div className="bg-slate-700/30 rounded-lg p-6 border border-purple-500/20">
                  <h3 className="text-lg font-semibold text-purple-300 mb-3">Key Characteristics</h3>
                  <ul className="space-y-2">
                    {generatedConcept.characteristics.map((char, index) => (
                      <li key={index} className="flex items-start gap-2 text-gray-200">
                        <span className="text-yellow-400 mt-1">•</span>
                        <span>{char}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Lore Snippet */}
              <div className="bg-slate-700/30 rounded-lg p-6 border border-purple-500/20">
                <h3 className="text-lg font-semibold text-purple-300 mb-3">Discovery Log</h3>
                <div className="text-gray-200 leading-relaxed italic border-l-4 border-yellow-400/50 pl-4">
                  {generatedConcept.loreSnippet}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
