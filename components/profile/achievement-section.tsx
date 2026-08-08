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
      const response = await fetch(`/careers/api/member/achievements/${achievementId}`, {
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
    <div>
      <div className="space-y-4">
        {achievements.map((achievement) => (
          <div key={achievement.id} className="flex min-w-0 items-center justify-between">
            <div className="flex min-w-0 items-start gap-2">
              <div className="shrink-0">
                <Trophy className="h-5 w-5 text-green-400 max-[270px]:h-4 max-[270px]:w-4" />
              </div>
              <div className="min-w-0 space-y-1">
                {/* <h3 className="font-medium">{achievement.title}</h3> */}
                {achievement.description && (
                  <h3 className="break-words text-sm sm:text-base">
                    {achievement.description}
                  </h3>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
