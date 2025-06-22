"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trophy, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Achievement {
  id: string;
  title: string;
  description: string;
  date: string;
}

interface AchievementSectionProps {
  achievements: Achievement[];
  isEditable?: boolean;
}

export function AchievementSection({
  achievements: initialAchievements,
  isEditable = false,
}: AchievementSectionProps) {
  const [achievements, setAchievements] = useState(initialAchievements);
  const { toast } = useToast();

  const handleDelete = async (achievementId: string) => {
    const originalAchievements = achievements;
    setAchievements(achievements.filter((ach) => ach.id !== achievementId));

    try {
      const response = await fetch(`/api/member/achievements/${achievementId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete achievement.");
      }

      toast({
        title: "Achievement Deleted",
        description: "The achievement has been successfully removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setAchievements(originalAchievements);
    }
  };
  
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Achievements</h2>
      </div>

      <div className="space-y-4">
        {achievements.map((achievement) => (
          <div key={achievement.id} className="flex justify-between items-start gap-4">
            <div className="flex gap-4">
              <div className="mt-1">
                <Trophy className="h-5 w-5 text-green-400" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium">{achievement.title}</h3>
                {achievement.description && (
                  <p className="text-sm text-muted-foreground">
                    {achievement.description}
                  </p>
                )}
              </div>
            </div>
            {isEditable && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(achievement.id)}
                className="shrink-0"
              >
                <Trash className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}