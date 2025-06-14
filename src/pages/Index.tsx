import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2, Sparkles, Download, Copy, AlertTriangle, Moon, Sun, Menu } from 'lucide-react';
import { toast } from 'sonner';

interface GeneratedConcept {
  name: string;
  description: string;
  characteristics: string[];
  loreSnippet: string;
  imageData: string;
}

const Index = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('genesis_dark_mode');
    return saved ? JSON.parse(saved) : true;
  });
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

  useEffect(() => {
    localStorage.setItem('genesis_dark_mode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

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
    <div className={`min-h-screen transition-all duration-500 ${isDarkMode ? 'bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 text-white' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-900'}`}>
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse transition-all duration-1000 ${isDarkMode ? 'bg-purple-500/10' : 'bg-purple-300/20'}`}></div>
        <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse delay-1000 transition-all duration-1000 ${isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-300/20'}`}></div>
        <div className={`absolute top-1/2 left-1/2 w-72 h-72 rounded-full blur-2xl animate-pulse delay-500 transition-all duration-1000 ${isDarkMode ? 'bg-yellow-500/5' : 'bg-yellow-300/15'}`}></div>
      </div>

      {/* Navbar */}
      <nav className={`relative z-50 border-b transition-all duration-300 ${isDarkMode ? 'bg-slate-900/80 backdrop-blur-md border-purple-500/20' : 'bg-white/80 backdrop-blur-md border-purple-200/40'}`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 animate-fade-in">
              <Sparkles className={`w-6 h-6 transition-colors duration-300 ${isDarkMode ? 'text-yellow-400' : 'text-purple-600'}`} />
              <h1 className={`text-xl font-bold bg-gradient-to-r bg-clip-text text-transparent transition-all duration-300 ${isDarkMode ? 'from-yellow-400 via-purple-300 to-blue-300' : 'from-purple-600 via-blue-600 to-indigo-600'}`}>
                AI Genesis Engine
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 animate-fade-in">
                <Sun className={`w-4 h-4 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-yellow-500'}`} />
                <Switch 
                  checked={isDarkMode} 
                  onCheckedChange={setIsDarkMode}
                  className="data-[state=checked]:bg-purple-600"
                />
                <Moon className={`w-4 h-4 transition-colors duration-300 ${isDarkMode ? 'text-blue-400' : 'text-gray-400'}`} />
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className={`w-8 h-8 animate-pulse transition-colors duration-300 ${isDarkMode ? 'text-yellow-400' : 'text-purple-600'}`} />
            <h2 className={`text-4xl md:text-5xl font-bold bg-gradient-to-r bg-clip-text text-transparent transition-all duration-300 ${isDarkMode ? 'from-yellow-400 via-purple-300 to-blue-300' : 'from-purple-600 via-blue-600 to-indigo-600'}`}>
              Forge New Worlds
            </h2>
            <Sparkles className={`w-8 h-8 animate-pulse delay-300 transition-colors duration-300 ${isDarkMode ? 'text-yellow-400' : 'text-purple-600'}`} />
          </div>
          <p className={`text-lg md:text-xl max-w-2xl mx-auto transition-colors duration-300 ${isDarkMode ? 'text-purple-200' : 'text-gray-700'}`}>
            Enter your vision and watch as the Genesis Engine breathes life into your concepts with AI-powered creativity.
          </p>
        </div>

        {/* API Key Input */}
        <Card className={`mb-8 transition-all duration-500 hover:scale-105 animate-fade-in ${isDarkMode ? 'bg-slate-800/50 border-purple-500/30 backdrop-blur-sm' : 'bg-white/70 border-purple-200/50 backdrop-blur-sm'}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 transition-colors duration-300 ${isDarkMode ? 'text-yellow-400' : 'text-purple-700'}`}>
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
                className={`transition-all duration-300 ${isDarkMode ? 'bg-slate-700/50 border-purple-400/30 text-white placeholder-gray-400' : 'bg-white/80 border-purple-300/40 text-gray-900 placeholder-gray-500'}`}
              />
              <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Your API key is stored locally and never shared. Required for both text and image generation.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Input Section */}
        <Card className={`mb-8 transition-all duration-500 hover:scale-105 animate-fade-in ${isDarkMode ? 'bg-slate-800/50 border-purple-500/30 backdrop-blur-sm' : 'bg-white/70 border-purple-200/50 backdrop-blur-sm'}`}>
          <CardHeader>
            <CardTitle className={`transition-colors duration-300 ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>Genesis Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="transform transition-all duration-300 hover:scale-105">
              <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-purple-200' : 'text-purple-700'}`}>
                Concept Type
              </label>
              <Select value={conceptType} onValueChange={setConceptType}>
                <SelectTrigger className={`transition-all duration-300 ${isDarkMode ? 'bg-slate-700/50 border-purple-400/30 text-white' : 'bg-white/80 border-purple-300/40 text-gray-900'}`}>
                  <SelectValue placeholder="Choose what you wish to create..." />
                </SelectTrigger>
                <SelectContent className={`${isDarkMode ? 'bg-slate-800 border-purple-500/30' : 'bg-white border-purple-200/50'}`}>
                  {conceptTypes.map((type) => (
                    <SelectItem key={type} value={type} className={`transition-colors duration-200 ${isDarkMode ? 'text-white hover:bg-purple-600/20' : 'text-gray-900 hover:bg-purple-100'}`}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="transform transition-all duration-300 hover:scale-105">
              <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-purple-200' : 'text-purple-700'}`}>
                Seed Idea / Keywords
              </label>
              <Textarea
                placeholder="Describe your vision... (e.g., 'Floating islands held by giant chains', 'Silicon-based life form that communicates with light patterns', 'A sword forged from a fallen star')"
                value={seedIdea}
                onChange={(e) => setSeedIdea(e.target.value)}
                rows={4}
                className={`resize-none transition-all duration-300 ${isDarkMode ? 'bg-slate-700/50 border-purple-400/30 text-white placeholder-gray-400' : 'bg-white/80 border-purple-300/40 text-gray-900 placeholder-gray-500'}`}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !apiKey || !conceptType || !seedIdea}
              className={`w-full font-semibold py-3 text-lg transition-all duration-300 transform hover:scale-105 ${isDarkMode ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white' : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white'}`}
            >
              {isGenerating ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="animate-pulse">{currentStep}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  Generate Concept!
                  <Sparkles className="w-5 h-5 animate-pulse delay-300" />
                </div>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Generated Content */}
        {generatedConcept && (
          <Card className={`transition-all duration-1000 animate-fade-in hover:scale-105 ${isDarkMode ? 'bg-slate-800/50 border-purple-500/30 backdrop-blur-sm' : 'bg-white/70 border-purple-200/50 backdrop-blur-sm'}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className={`text-2xl transition-colors duration-300 ${isDarkMode ? 'text-yellow-400' : 'text-purple-700'}`}>Genesis Log Entry</CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={downloadImage}
                    variant="outline"
                    size="sm"
                    className={`transition-all duration-300 hover:scale-110 ${isDarkMode ? 'border-purple-400/30 text-purple-300 hover:bg-purple-600/20' : 'border-purple-300/50 text-purple-700 hover:bg-purple-100'}`}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Image
                  </Button>
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    size="sm"
                    className={`transition-all duration-300 hover:scale-110 ${isDarkMode ? 'border-purple-400/30 text-purple-300 hover:bg-purple-600/20' : 'border-purple-300/50 text-purple-700 hover:bg-purple-100'}`}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Text
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Image */}
              <div className="flex justify-center animate-fade-in">
                <div className="relative group">
                  <img
                    src={generatedConcept.imageData}
                    alt={generatedConcept.name}
                    className={`max-w-full h-auto rounded-lg shadow-2xl transition-all duration-500 group-hover:scale-105 group-hover:shadow-3xl ${isDarkMode ? 'border border-purple-500/30' : 'border border-purple-200/50'}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg pointer-events-none transition-opacity duration-300 group-hover:opacity-50"></div>
                </div>
              </div>

              {/* Name */}
              <div className="text-center animate-fade-in">
                <h2 className={`text-3xl font-bold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-yellow-400' : 'text-purple-700'}`}>
                  {generatedConcept.name}
                </h2>
                <div className={`h-px bg-gradient-to-r from-transparent to-transparent via-current transition-colors duration-300 ${isDarkMode ? 'text-purple-400' : 'text-purple-400'}`}></div>
              </div>

              {/* Description */}
              <div className={`rounded-lg p-6 transition-all duration-500 hover:scale-105 ${isDarkMode ? 'bg-slate-700/30 border border-purple-500/20' : 'bg-purple-50/50 border border-purple-200/30'}`}>
                <h3 className={`text-lg font-semibold mb-3 transition-colors duration-300 ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>Core Description</h3>
                <p className={`leading-relaxed transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>{generatedConcept.description}</p>
              </div>

              {/* Characteristics */}
              {generatedConcept.characteristics.length > 0 && (
                <div className={`rounded-lg p-6 transition-all duration-500 hover:scale-105 ${isDarkMode ? 'bg-slate-700/30 border border-purple-500/20' : 'bg-purple-50/50 border border-purple-200/30'}`}>
                  <h3 className={`text-lg font-semibold mb-3 transition-colors duration-300 ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>Key Characteristics</h3>
                  <ul className="space-y-2">
                    {generatedConcept.characteristics.map((char, index) => (
                      <li key={index} className={`flex items-start gap-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        <span className={`mt-1 transition-colors duration-300 ${isDarkMode ? 'text-yellow-400' : 'text-purple-600'}`}>•</span>
                        <span>{char}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Lore Snippet */}
              <div className={`rounded-lg p-6 transition-all duration-500 hover:scale-105 ${isDarkMode ? 'bg-slate-700/30 border border-purple-500/20' : 'bg-purple-50/50 border border-purple-200/30'}`}>
                <h3 className={`text-lg font-semibold mb-3 transition-colors duration-300 ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>Discovery Log</h3>
                <div className={`leading-relaxed italic border-l-4 pl-4 transition-colors duration-300 ${isDarkMode ? 'text-gray-200 border-yellow-400/50' : 'text-gray-700 border-purple-400/50'}`}>
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
