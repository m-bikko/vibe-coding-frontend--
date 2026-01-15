import React, { ChangeEvent, useState } from 'react';
import { Button } from './ui/button';
import { Upload, FileJson } from 'lucide-react';
import { parseJsonl, StreamEvent } from '../lib/parser';

interface ChatWelcomeProps {
    onLoaded: (events: StreamEvent[], fileName: string) => void;
}

export function ChatWelcome({ onLoaded }: ChatWelcomeProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const processFile = (file: File) => {
        setLoading(true);
        setError(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const events = parseJsonl(text);
                if (events.length === 0) {
                    setError('В файле не найдено корректных событий.');
                } else {
                    onLoaded(events, file.name);
                }
            } catch (err) {
                setError('Ошибка при разборе файла.');
            } finally {
                setLoading(false);
            }
        };
        reader.onerror = () => {
            setError('Ошибка чтения файла.');
            setLoading(false);
        };
        reader.readAsText(file);
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-in fade-in duration-500">
            <div
                className={`
                    w-full max-w-md p-10 border-2 border-dashed rounded-3xl transition-all duration-300
                    flex flex-col items-center gap-6
                    ${isDragging
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
                    }
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center">
                    <FileJson className="w-10 h-10 text-blue-500" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        Загрузите дамп диалога
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Перетащите файл .jsonl сюда или выберите его вручную
                    </p>
                </div>

                {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg w-full">
                        {error}
                    </div>
                )}

                <div className="flex gap-3 w-full">
                    <Button size="lg" className="w-full relative shadow-lg hover:shadow-xl transition-all" asChild>
                        <label className="cursor-pointer">
                            <Upload className="mr-2 h-4 w-4" />
                            {loading ? 'Читаем файлы...' : 'Выбрать файл'}
                            <input
                                type="file"
                                accept=".jsonl,.json"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </label>
                    </Button>
                </div>

                <p className="text-xs text-slate-400 dark:text-slate-500">
                    Поддерживаются форматы JSONL с потоковыми событиями
                </p>
            </div>
        </div>
    );
}
