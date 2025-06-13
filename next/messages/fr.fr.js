const group_only =
  "🛑 [user], cette commande n'est disponible que dans les groupes.";
const admin_only =
  '🛑 [user], cette commande est réservée aux *administrateurs de groupe*.';
const owner_only =
  '🛑 [user], cette commande est réservée aux *administrateurs de NextBOT*.';
const admin_protection =
  "🛑 [user], cette commande ne peut pas être appliquée à d'autres *administrateurs de groupe*.";
const missing_args =
  "🛑 [user], il semble que certains arguments manquent à votre commande.\nExemple d'utilisation : [example]";

export default {
  group_only,
  admin_only,
  owner_only,
  admin_protection,
  missing_args,
};
