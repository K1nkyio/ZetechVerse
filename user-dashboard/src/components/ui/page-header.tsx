import { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  centered?: boolean;
};

export const PageHeader = ({
  title,
  description,
  icon,
  actions,
  centered = false,
}: PageHeaderProps) => {
  return (
    <div
      className={`mb-8 space-y-3 ${centered ? 'text-center' : ''}`}
      aria-labelledby="page-title"
    >
      <div
        className={`flex gap-3 ${centered ? 'justify-center items-center' : 'items-start justify-between'}`}
      >
        <div className="space-y-2">
          <h1 id="page-title" className="text-3xl md:text-4xl font-bold tracking-tight">
            <span className="inline-flex items-center gap-2">
              {icon}
              {title}
            </span>
          </h1>
          {description ? (
            <p className="text-muted-foreground max-w-2xl">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
};

export default PageHeader;
