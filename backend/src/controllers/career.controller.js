const {
  ensureCommunityFeatureSchema,
  sanitizeArrayStrings,
  getCareerProfileByUserId,
  get,
  all,
  run
} = require('../utils/communityExtensions');

const scoreOpportunityForProfile = (opportunity, profile, user) => {
  const haystack = [
    opportunity.title,
    opportunity.description,
    opportunity.company,
    opportunity.category_name,
    opportunity.type,
    opportunity.location
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let score = 0;
  const reasons = [];
  const skills = sanitizeArrayStrings(profile.skills);
  const interests = sanitizeArrayStrings(profile.interests);

  for (const skill of skills) {
    if (haystack.includes(skill.toLowerCase())) {
      score += 14;
      reasons.push(`Matches your skill in ${skill}`);
    }
  }

  for (const interest of interests) {
    if (haystack.includes(interest.toLowerCase())) {
      score += 10;
      reasons.push(`Aligned with your interest in ${interest}`);
    }
  }

  if (user?.course && haystack.includes(String(user.course).toLowerCase())) {
    score += 12;
    reasons.push(`Relevant to your course: ${user.course}`);
  }

  if (opportunity.is_remote) {
    score += 6;
    reasons.push('Remote-friendly option');
  }

  if (opportunity.is_paid) {
    score += 5;
    reasons.push('Paid opportunity');
  }

  if (!reasons.length) {
    reasons.push('Fresh active opportunity worth reviewing');
    score += 2;
  }

  return {
    score,
    reasons: reasons.slice(0, 3)
  };
};

const getCareerProfile = async (req, res) => {
  try {
    const profile = await getCareerProfileByUserId(req.user.id);
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error fetching career profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch career profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateCareerProfile = async (req, res) => {
  try {
    await ensureCommunityFeatureSchema();

    const skills = sanitizeArrayStrings(req.body.skills);
    const interests = sanitizeArrayStrings(req.body.interests);
    const mentorshipTopics = sanitizeArrayStrings(req.body.mentorship_topics);

    await run(
      `
        INSERT INTO user_career_profiles (
          user_id, resume_url, resume_filename, skills, interests, linkedin_url, portfolio_url,
          mentor_open, mentor_bio, mentorship_topics, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO UPDATE SET
          resume_url = EXCLUDED.resume_url,
          resume_filename = EXCLUDED.resume_filename,
          skills = EXCLUDED.skills,
          interests = EXCLUDED.interests,
          linkedin_url = EXCLUDED.linkedin_url,
          portfolio_url = EXCLUDED.portfolio_url,
          mentor_open = EXCLUDED.mentor_open,
          mentor_bio = EXCLUDED.mentor_bio,
          mentorship_topics = EXCLUDED.mentorship_topics,
          updated_at = CURRENT_TIMESTAMP
      `,
      [
        req.user.id,
        req.body.resume_url || null,
        req.body.resume_filename || null,
        JSON.stringify(skills),
        JSON.stringify(interests),
        req.body.linkedin_url || null,
        req.body.portfolio_url || null,
        Boolean(req.body.mentor_open),
        req.body.mentor_bio || null,
        JSON.stringify(mentorshipTopics)
      ]
    );

    const profile = await getCareerProfileByUserId(req.user.id);
    res.json({
      success: true,
      message: 'Career profile updated successfully',
      data: profile
    });
  } catch (error) {
    console.error('Error updating career profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update career profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getRecommendations = async (req, res) => {
  try {
    await ensureCommunityFeatureSchema();

    const profile = await getCareerProfileByUserId(req.user.id);
    const user = await get(
      'SELECT id, course, year_of_study, full_name FROM users WHERE id = ?',
      [req.user.id]
    );

    const opportunities = await all(
      `
        SELECT
          o.*,
          c.name AS category_name,
          c.slug AS category_slug
        FROM opportunities o
        LEFT JOIN categories c ON c.id = o.category_id
        WHERE o.status = 'active'
          AND (o.application_deadline IS NULL OR o.application_deadline > CURRENT_TIMESTAMP)
        ORDER BY o.created_at DESC
        LIMIT 40
      `
    );

    const recommendations = opportunities
      .map((opportunity) => {
        const recommendation = scoreOpportunityForProfile(opportunity, profile, user);
        return {
          ...opportunity,
          recommendation_score: recommendation.score,
          recommendation_reasons: recommendation.reasons,
          requirements: sanitizeArrayStrings(opportunity.requirements),
          benefits: sanitizeArrayStrings(opportunity.benefits),
          responsibilities: sanitizeArrayStrings(opportunity.responsibilities)
        };
      })
      .sort((a, b) => b.recommendation_score - a.recommendation_score)
      .slice(0, 8);

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Error fetching career recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommendations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const toggleSavedOpportunity = async (req, res) => {
  try {
    await ensureCommunityFeatureSchema();

    const opportunityId = Number(req.params.id);
    const opportunity = await get('SELECT id FROM opportunities WHERE id = ?', [opportunityId]);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found'
      });
    }

    const existing = await get(
      'SELECT id FROM saved_opportunities WHERE user_id = ? AND opportunity_id = ?',
      [req.user.id, opportunityId]
    );

    let saved = false;
    if (existing) {
      await run('DELETE FROM saved_opportunities WHERE id = ?', [existing.id]);
    } else {
      await run(
        'INSERT INTO saved_opportunities (user_id, opportunity_id) VALUES (?, ?)',
        [req.user.id, opportunityId]
      );
      saved = true;
    }

    res.json({
      success: true,
      message: saved ? 'Opportunity saved' : 'Opportunity removed from saved list',
      data: { saved }
    });
  } catch (error) {
    console.error('Error updating saved opportunities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update saved opportunities',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getSavedOpportunities = async (req, res) => {
  try {
    await ensureCommunityFeatureSchema();

    const rows = await all(
      `
        SELECT
          s.created_at AS saved_at,
          o.*,
          c.name AS category_name,
          c.slug AS category_slug
        FROM saved_opportunities s
        INNER JOIN opportunities o ON o.id = s.opportunity_id
        LEFT JOIN categories c ON c.id = o.category_id
        WHERE s.user_id = ?
        ORDER BY s.created_at DESC
      `,
      [req.user.id]
    );

    res.json({
      success: true,
      data: rows.map((row) => ({
        ...row,
        requirements: sanitizeArrayStrings(row.requirements),
        benefits: sanitizeArrayStrings(row.benefits),
        responsibilities: sanitizeArrayStrings(row.responsibilities)
      }))
    });
  } catch (error) {
    console.error('Error fetching saved opportunities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch saved opportunities',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const submitApplication = async (req, res) => {
  try {
    await ensureCommunityFeatureSchema();

    const opportunityId = Number(req.params.id);
    const opportunity = await get(
      'SELECT id, title, application_url FROM opportunities WHERE id = ?',
      [opportunityId]
    );

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found'
      });
    }

    const profile = await getCareerProfileByUserId(req.user.id);
    const resumeUrl = req.body.resume_url || profile.resume_url || null;

    const existing = await get(
      'SELECT id FROM opportunity_applications WHERE opportunity_id = ? AND applicant_id = ?',
      [opportunityId, req.user.id]
    );

    if (existing) {
      await run(
        `
          UPDATE opportunity_applications
          SET cover_letter = ?, resume_url = ?, additional_info = ?, status = 'reviewed'
          WHERE id = ?
        `,
        [
          req.body.cover_letter || null,
          resumeUrl,
          req.body.additional_info || null,
          existing.id
        ]
      );
    } else {
      await run(
        `
          INSERT INTO opportunity_applications (
            opportunity_id, applicant_id, status, cover_letter, resume_url, additional_info
          ) VALUES (?, ?, 'pending', ?, ?, ?)
        `,
        [
          opportunityId,
          req.user.id,
          req.body.cover_letter || null,
          resumeUrl,
          req.body.additional_info || null
        ]
      );
    }

    const count = await get(
      'SELECT COUNT(*)::INTEGER AS count FROM opportunity_applications WHERE opportunity_id = ?',
      [opportunityId]
    );
    await run(
      'UPDATE opportunities SET applications_count = ? WHERE id = ?',
      [Number(count?.count || 0), opportunityId]
    );

    res.json({
      success: true,
      message: 'Application saved to your tracker',
      data: {
        opportunity_id: opportunityId,
        resume_url: resumeUrl,
        external_application_url: opportunity.application_url || null
      }
    });
  } catch (error) {
    console.error('Error submitting opportunity application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save your application',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getApplications = async (req, res) => {
  try {
    await ensureCommunityFeatureSchema();

    const rows = await all(
      `
        SELECT
          oa.*,
          o.title,
          o.company,
          o.location,
          o.type,
          o.application_deadline,
          o.application_url,
          o.status AS opportunity_status
        FROM opportunity_applications oa
        INNER JOIN opportunities o ON o.id = oa.opportunity_id
        WHERE oa.applicant_id = ?
        ORDER BY oa.applied_at DESC
      `,
      [req.user.id]
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching application tracker:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your applications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getMentors = async (req, res) => {
  try {
    await ensureCommunityFeatureSchema();

    const mentors = await all(
      `
        SELECT
          u.id,
          u.full_name,
          u.username,
          u.course,
          u.year_of_study,
          u.avatar_url,
          cp.mentor_bio,
          cp.mentorship_topics,
          cp.linkedin_url,
          cp.portfolio_url
        FROM user_career_profiles cp
        INNER JOIN users u ON u.id = cp.user_id
        WHERE cp.mentor_open = true
          AND u.id <> ?
        ORDER BY u.full_name ASC NULLS LAST, u.username ASC
      `,
      [req.user.id]
    );

    res.json({
      success: true,
      data: mentors.map((mentor) => ({
        ...mentor,
        mentorship_topics: sanitizeArrayStrings(mentor.mentorship_topics)
      }))
    });
  } catch (error) {
    console.error('Error fetching mentors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mentors',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const requestMentorConnection = async (req, res) => {
  try {
    await ensureCommunityFeatureSchema();

    const mentorId = Number(req.params.mentorId);
    if (mentorId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot request mentorship from yourself'
      });
    }

    const mentor = await get(
      `
        SELECT u.id
        FROM user_career_profiles cp
        INNER JOIN users u ON u.id = cp.user_id
        WHERE u.id = ? AND cp.mentor_open = true
      `,
      [mentorId]
    );

    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found'
      });
    }

    await run(
      `
        INSERT INTO mentor_connections (mentor_id, mentee_id, message, status)
        VALUES (?, ?, ?, 'pending')
        ON CONFLICT (mentor_id, mentee_id) DO UPDATE SET
          message = EXCLUDED.message,
          status = 'pending',
          responded_at = NULL
      `,
      [mentorId, req.user.id, req.body.message || null]
    );

    res.json({
      success: true,
      message: 'Mentor connection request sent'
    });
  } catch (error) {
    console.error('Error requesting mentor connection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request mentor connection',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getMentorConnections = async (req, res) => {
  try {
    await ensureCommunityFeatureSchema();

    const rows = await all(
      `
        SELECT
          mc.*,
          mentor.full_name AS mentor_full_name,
          mentor.username AS mentor_username,
          mentee.full_name AS mentee_full_name,
          mentee.username AS mentee_username
        FROM mentor_connections mc
        INNER JOIN users mentor ON mentor.id = mc.mentor_id
        INNER JOIN users mentee ON mentee.id = mc.mentee_id
        WHERE mc.mentor_id = ? OR mc.mentee_id = ?
        ORDER BY mc.created_at DESC
      `,
      [req.user.id, req.user.id]
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching mentor connections:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mentor connections',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getCareerProfile,
  updateCareerProfile,
  getRecommendations,
  toggleSavedOpportunity,
  getSavedOpportunities,
  submitApplication,
  getApplications,
  getMentors,
  requestMentorConnection,
  getMentorConnections
};
