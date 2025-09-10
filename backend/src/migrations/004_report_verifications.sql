-- Create report_verifications table for community verification
CREATE TABLE report_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  verified BOOLEAN NOT NULL, -- true = verified, false = disputed
  reason TEXT, -- optional reason for verification/dispute
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(report_id, user_id) -- one verification per user per report
);

-- Add parent_id to comments table for replies
ALTER TABLE comments ADD COLUMN parent_id UUID REFERENCES comments(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_report_verifications_report_id ON report_verifications(report_id);
CREATE INDEX idx_report_verifications_user_id ON report_verifications(user_id);
CREATE INDEX idx_report_verifications_verified ON report_verifications(verified);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);

-- Create trigger for updating timestamps
CREATE TRIGGER update_report_verifications_updated_at BEFORE UPDATE ON report_verifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
