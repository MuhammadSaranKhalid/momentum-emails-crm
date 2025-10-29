'use client';

import { useList } from '@refinedev/core';
import { Template } from '@/app/dashboard/templates/schema';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SelectTemplateProps {
  onSelect: (template: { subject: string; body: string }) => void;
  onSkip: () => void;
}

export function SelectTemplate({ onSelect, onSkip }: SelectTemplateProps) {
  const { result, query:{isLoading, isError} } = useList<Template>({
    resource: 'templates',
    sorters: [
      {
        field: "created_at",
        order: "desc",
      },
    ],
  });

  const templates = result?.data || [];

  return (
    <div className="max-h-[70vh] overflow-y-auto p-1 -mr-6 pr-6">
        {isLoading && (
            <div className="flex items-center justify-center p-10 h-96">
            <Spinner className="h-8 w-8" />
            </div>
        )}
        {isError && (
            <div className="text-red-500 text-center p-10">
            Error loading templates. Please try again later.
            </div>
        )}
        {!isLoading && !isError && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
                <Card 
                key={template.id} 
                className="flex flex-col transition-all hover:shadow-lg cursor-pointer group"
                onClick={() => onSelect({ body: template.html_content })}
                >
                <CardHeader>
                    <CardTitle className="truncate">{template.name}</CardTitle>
                    <CardDescription className="h-10 text-ellipsis overflow-hidden">{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                    <div className="w-full h-48 bg-white rounded-md overflow-hidden border pointer-events-none">
                        <iframe 
                            srcDoc={template.html_content}
                            title={template.name}
                            className="w-[200%] h-[200%] scale-[0.5] origin-top-left border-0"
                        />
                    </div>
                </CardContent>
                <div className="p-4 pt-0">
                    <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground">
                        Use Template
                    </Button>
                </div>
                </Card>
            ))}
            </div>
        )}
    </div>
  );
}
