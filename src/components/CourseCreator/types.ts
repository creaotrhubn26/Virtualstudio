/**
 * Shared types for Course Creator components
 */

export interface Module {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: Lesson[];
  completionRequirement?: 'all' | 'any' | number;
  isLocked?: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'quiz' | 'text' | 'assignment';
  videoUrl?: string;
  duration?: string;
  order: number;
  moduleId: string;
  isLocked?: boolean;
}

export interface Resource {
  id: string;
  name: string;
  type: 'file' | 'link' | 'document';
  url: string;
  description?: string;
  size?: number;
  category?: string;
  order: number;
}

export interface LowerThird {
  id: string;
  mainText: string;
  subText?: string;
  startTime: number;
  endTime: number;
  position: 'bottom-left' | 'bottom-center' | 'bottom-right';
  style: {
    fontSize: number;
    fontFamily: string;
    textColor: string;
    backgroundColor: string;
    opacity: number;
    animation: 'fade' | 'slide' | 'none';
  };
  videoId: string;
  order: number;
}

export interface VideoChapter {
  id: string;
  title: string;
  timestamp: number;
  description?: string;
  order: number;
  videoId: string;
}


















