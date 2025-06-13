const group_only = '🛑 [user], this command is available only in groups.';
const admin_only = '🛑 [user], this command is restricted to *group admins*.';
const owner_only =
  "🛑 [user], this command is restricted to *NextBOT's admins*.";
const admin_protection =
  '🛑 [user], this command cannot be applied to other *group admins*.';
const missing_args =
  '🛑 [user], it seems that some arguments are missing from your command.\nUsage example: [example]';

export default {
  group_only,
  admin_only,
  owner_only,
  admin_protection,
  missing_args,
};
