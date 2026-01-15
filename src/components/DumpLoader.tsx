import React, { ChangeEvent, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { parseJsonl, StreamEvent } from '../lib/parser';
import { Upload } from 'lucide-react';

interface DumpLoaderProps {
    onLoaded: (events: StreamEvent[], fileName: string) => void;
    fileName?: string;
}

export function DumpLoader({ onLoaded, fileName: externalFileName }: DumpLoaderProps) {
    // Keep local state for immediate feedback during upload, but sync with external if provided
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

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

    return (
        <div className="flex items-center justify-between gap-4 p-3 border rounded-lg bg-background w-full">
            <div className="text-sm font-medium truncate flex-1 leading-none">
                {error ? (
                    <span className="text-red-500">{error}</span>
                ) : (
                    externalFileName || <span className="text-muted-foreground">Файл не выбран</span>
                )}
            </div>

            <Button variant="outline" size="sm" className="relative cursor-pointer shrink-0" asChild>
                <label>
                    <Upload className="mr-2 h-3.5 w-3.5" />
                    {loading ? 'Загрузка...' : 'Загрузить дамп'}
                    <input
                        type="file"
                        accept=".jsonl,.json"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </label>
            </Button>
        </div>
    );
}
