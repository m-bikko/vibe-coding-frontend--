import React, { useRef, useEffect, useState } from 'react';
import { DumpLoader } from './DumpLoader';
import { StreamControls } from './StreamControls';
import { VegaPreview } from './VegaPreview';
import { StreamStatus } from '../lib/useStreamPlayer';
import { StreamEvent } from '../lib/parser';
import { Bot, User, Copy, Check, Brain, ChevronDown, ChevronRight, Download, FileText } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface ChatModeProps {
    status: StreamStatus;
    currentText: string;
    play: () => void;
    stop: () => void;
    speedMultiplier: number;
    setSpeedMultiplier: (speed: number) => void;
    hasEvents: boolean;
    handleLoaded: (events: StreamEvent[]) => void;
}

// Simple Typing Indicator Component
function TypingIndicator() {
    return (
        <div className="flex gap-1 items-center p-2">
            <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse-slow" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse-slow" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse-slow" style={{ animationDelay: '300ms' }} />
        </div>
    );
}

// Helper to extract thought block
function parseThinking(text: string) {
    // Regex to capture content between <thought> tags (handling unclosed for streaming)
    // Also supports <think> for DeepSeek compatibility
    const thoughtMatch = text.match(/<(thought|think)>([\s\S]*?)(<\/(thought|think)>|$)/);

    if (thoughtMatch) {
        const fullMatch = thoughtMatch[0];
        const thoughtContent = thoughtMatch[2];
        const isClosed = !!thoughtMatch[3] && thoughtMatch[3].startsWith('</');

        // Everything AFTER the thought block is the main content
        // If unclosed, main content is empty
        const mainContent = text.replace(fullMatch, '');

        return { hasThought: true, thought: thoughtContent, content: mainContent, isClosed };
    }

    return { hasThought: false, thought: '', content: text, isClosed: true };
}

function ThinkingBlock({ thought, isClosed }: { thought: string, isClosed: boolean }) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="mb-4 border rounded-lg bg-gray-50 dark:bg-slate-900 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-2 p-2 bg-gray-100 dark:bg-slate-800 text-xs font-medium text-muted-foreground hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            >
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Brain className="h-3 w-3" />
                <span>Процесс мышления</span>
                {!isClosed && <span className="animate-pulse ml-2 text-blue-500">●</span>}
            </button>

            {isOpen && (
                <div className="p-3 text-xs text-muted-foreground font-mono leading-relaxed border-t dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/30">
                    <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{thought}</ReactMarkdown>
                </div>
            )}
        </div>
    );
}

export function ChatMode({
    status,
    currentText,
    play,
    stop,
    speedMultiplier,
    setSpeedMultiplier,
    hasEvents,
    handleLoaded
}: ChatModeProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);

    // Parse the stream
    const { hasThought, thought, content: cleanContent, isClosed } = parseThinking(currentText);

    // Auto-scroll logic similar to StreamingOutput
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentText, status, hasThought]); // Depend on structure changes as well

    const handleCopy = () => {
        navigator.clipboard.writeText(currentText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const blob = new Blob([currentText], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'chat-response.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadPDF = async () => {
        if (!contentRef.current) return;

        try {
            // Dynamically import html2pdf to avoid SSR issues
            // @ts-ignore
            const html2pdf = (await import('html2pdf.js')).default;
            const element = contentRef.current;
            const opt = {
                margin: 0.5,
                filename: 'chat-response.pdf',
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const }
            };
            html2pdf().set(opt).from(element).save();
        } catch (e) {
            console.error('PDF generation failed', e);
        }
    };

    // Derived state for when to show typing indicator
    // Show if we are streaming OR if we have events but have not finished (though status 'streaming' covers mostly)
    const showTyping = status === 'streaming';

    // Only show bot if there is *some* text (thought or content) OR we are strictly streaming thinking
    const showBot = currentText || showTyping;

    return (
        <div className="mx-auto flex flex-col h-[calc(100vh-140px)] relative">
            {/* Chat Area - Takes available space */}
            <div className="flex-1 overflow-y-auto space-y-6 pb-4">

                {/* User Message (simulated for context) */}
                {hasEvents && (
                    <div className="flex gap-4 justify-end">
                        <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-2xl rounded-tr-sm max-w-[80%]">
                            <p className="text-sm font-medium">Проанализируйте загруженные данные и визуализируйте их.</p>
                        </div>
                        <div className="hidden sm:flex w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 items-center justify-center shrink-0">
                            <User className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                        </div>
                    </div>
                )}

                {/* Bot Message - Only show if we have started streaming */}
                {showBot && (
                    <div className="flex gap-4">
                        <div className="hidden sm:flex w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 items-center justify-center shrink-0">
                            <Bot className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                        </div>
                        <div className="space-y-4 max-w-[90%] w-full">

                            {/* Thought Block if exists */}
                            {hasThought && (
                                <ThinkingBlock thought={thought} isClosed={isClosed} />
                            )}

                            {/* Text Output Block */}
                            <div ref={contentRef} className="bg-white dark:bg-slate-800 border p-4 rounded-2xl rounded-tl-sm shadow-sm overflow-hidden relative group min-h-[60px]">
                                <div className="prose dark:prose-invert text-sm max-w-none break-words">
                                    <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                                        {cleanContent}
                                    </ReactMarkdown>
                                </div>



                                <VegaPreview currentText={cleanContent} minified={true} />

                                {cleanContent && (
                                    <div className="flex justify-end gap-1 mt-4 pt-2 border-t dark:border-slate-800/50">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-2 text-xs text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                                            onClick={handleDownloadPDF}
                                            title="Скачать PDF"
                                        >
                                            <FileText className="h-3.5 w-3.5 mr-1" />
                                            PDF
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-2 text-xs text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                                            onClick={handleDownload}
                                            title="Скачать Markdown"
                                        >
                                            <Download className="h-3.5 w-3.5 mr-1" />
                                            MD
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-2 text-xs text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                                            onClick={handleCopy}
                                            title="Скопировать"
                                        >
                                            {copied ? (
                                                <>
                                                    <Check className="h-3.5 w-3.5 mr-1 text-green-500" />
                                                    <span className="text-green-500">Скопировано</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-3.5 w-3.5 mr-1" />
                                                    Копировать
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div ref={bottomRef} className="h-4" />
            </div>

            {/* Controls - Sticky at bottom */}
            <div className="shrink-0 bg-slate-50 dark:bg-slate-900 z-10 pt-4 border-t">
                <div className="flex flex-col gap-3">
                    <div className="w-full">
                        <DumpLoader onLoaded={handleLoaded} />
                    </div>
                    <div className="w-full">
                        <StreamControls
                            onPlay={play}
                            onStop={stop}
                            status={status}
                            speed={speedMultiplier}
                            setSpeed={setSpeedMultiplier}
                            disabled={!hasEvents}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
