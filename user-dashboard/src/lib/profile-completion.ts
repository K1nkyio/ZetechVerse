type BasicUserProfile = {
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  phone?: string | null;
  course?: string | null;
  year_of_study?: number | null;
};

type BasicCareerProfile = {
  resume_url?: string | null;
  skills?: string[] | null;
  interests?: string[] | null;
};

const hasText = (value?: string | null) => Boolean(String(value || '').trim());

export const getProfileCompletionChecks = (
  user?: BasicUserProfile | null,
  careerProfile?: BasicCareerProfile | null,
  options: { includeCareer?: boolean } = {}
) => {
  const checks = [
    { key: 'full_name', label: 'Full name', complete: hasText(user?.full_name) },
    { key: 'avatar_url', label: 'Profile photo', complete: hasText(user?.avatar_url) },
    { key: 'bio', label: 'Bio', complete: hasText(user?.bio) },
    { key: 'phone', label: 'Phone number', complete: hasText(user?.phone) },
    { key: 'course', label: 'Course', complete: hasText(user?.course) },
    {
      key: 'year_of_study',
      label: 'Year of study',
      complete: Number.isFinite(Number(user?.year_of_study || 0)) && Number(user?.year_of_study || 0) > 0
    },
    { key: 'email', label: 'Email address', complete: hasText(user?.email) }
  ];

  if (options.includeCareer !== false) {
    checks.push(
      { key: 'resume_url', label: 'CV or resume', complete: hasText(careerProfile?.resume_url) },
      {
        key: 'skills',
        label: 'Skills',
        complete: Array.isArray(careerProfile?.skills) && careerProfile.skills.length > 0
      },
      {
        key: 'interests',
        label: 'Career interests',
        complete: Array.isArray(careerProfile?.interests) && careerProfile.interests.length > 0
      }
    );
  }

  return checks;
};

export const getProfileCompletionSummary = (
  user?: BasicUserProfile | null,
  careerProfile?: BasicCareerProfile | null,
  options: { includeCareer?: boolean } = {}
) => {
  const checks = getProfileCompletionChecks(user, careerProfile, options);
  const completed = checks.filter((check) => check.complete).length;
  const total = checks.length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  let statusLabel = 'Needs setup';
  if (percentage >= 100) statusLabel = 'Complete';
  else if (percentage >= 60) statusLabel = 'In progress';

  return {
    checks,
    completed,
    total,
    percentage,
    statusLabel,
    remaining: checks.filter((check) => !check.complete)
  };
};
