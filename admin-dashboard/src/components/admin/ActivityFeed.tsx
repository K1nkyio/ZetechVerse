import { cn } from "@/lib/utils";
import { FileText, MessageSquare, User, CheckCircle, XCircle } from "lucide-react";

interface Activity {
  id: string;
  type: 'post' | 'comment' | 'user' | 'approval' | 'rejection';
  title: string;
  description: string;
  time: string;
}

interface ActivityFeedProps {
  activities: Activity[];
  className?: string;
}

const activityIcons = {
  post: FileText,
  comment: MessageSquare,
  user: User,
  approval: CheckCircle,
  rejection: XCircle,
};

const activityColors = {
  post: 'bg-primary/10 text-primary',
  comment: 'bg-accent/10 text-accent',
  user: 'bg-success/10 text-success',
  approval: 'bg-success/10 text-success',
  rejection: 'bg-destructive/10 text-destructive',
};

export function ActivityFeed({ activities, className }: ActivityFeedProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {activities.map((activity, index) => {
        const Icon = activityIcons[activity.type];
        const colorClass = activityColors[activity.type];
        
        return (
          <div
            key={activity.id}
            className={cn(
              "flex gap-4 p-4 rounded-lg bg-card border border-border hover:border-primary/20 transition-colors",
              "animate-slide-in-left"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className={cn("p-2 rounded-lg h-fit", colorClass)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{activity.title}</p>
              <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
          </div>
        );
      })}
    </div>
  );
}
