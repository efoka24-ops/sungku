import { PrismaClient } from "@prisma/client";
import QRCode from "qrcode";

const prisma = new PrismaClient();

// Demo campaigns seeded as real, moderatable records (APPROVED, PUBLIQUE).
const CAMPAIGNS = [
  { slug: "soins-maman-ngo-bell", title: "Soins pour Maman Ngo Bell", category: "SANTE", targetAmount: 2500000, beneficiary: "Famille Ngo Bell", description: "Maman Ngo Bell a besoin d'une intervention chirurgicale urgente à l'Hôpital Général de Douala. Chaque contribution rapproche la famille de l'objectif et permet une prise en charge rapide." },
  { slug: "obseques-papa-etoundi", title: "Obsèques de Papa Etoundi", category: "FUNERAILLES", targetAmount: 1800000, beneficiary: "Famille Etoundi", description: "La famille Etoundi organise les obsèques de leur père à Yaoundé et sollicite le soutien de la communauté pour couvrir les frais de cérémonie." },
  { slug: "forage-eau-bafia", title: "Forage d'eau potable à Bafia", category: "PROJET_COMMUNAUTAIRE", targetAmount: 4200000, beneficiary: "Comité de développement de Bafia", description: "Un forage d'eau potable pour desservir plus de 600 habitants du quartier Bafia-Centre, aujourd'hui contraints de parcourir plusieurs kilomètres pour s'approvisionner en eau." },
  { slug: "bourse-aicha-moussa", title: "Bourse d'études pour Aïcha Moussa", category: "EDUCATION", targetAmount: 900000, beneficiary: "Aïcha Moussa", description: "Aïcha, admise en médecine, a besoin d'aide pour financer sa première année universitaire à Maroua." },
  { slug: "tontine-commercantes-mokolo", title: "Tontine des Commerçantes du Marché Mokolo", category: "TONTINE", targetAmount: 3000000, beneficiary: "Groupe des commerçantes de Mokolo", description: "Cagnotte collective mensuelle du groupe de tontine des commerçantes du marché Mokolo, avec suivi individuel des contributions de chaque membre.", isTontine: true },
  { slug: "ecole-meiganga", title: "Reconstruction de l'école publique de Meiganga", category: "EDUCATION", targetAmount: 6000000, beneficiary: "APEE Meiganga", description: "Deux salles de classe détruites par les pluies doivent être reconstruites avant la rentrée scolaire pour accueillir plus de 300 élèves." },
];

async function main() {
  for (const c of CAMPAIGNS) {
    const qrCodeDataUrl = await QRCode.toDataURL(`http://localhost:3000/c/${c.slug}`, {
      color: { dark: "#654DDF", light: "#00000000" },
    });
    await prisma.campaign.upsert({
      where: { slug: c.slug },
      update: {}, // don't overwrite moderation decisions on re-seed
      create: {
        slug: c.slug,
        title: c.title,
        description: c.description,
        category: c.category,
        targetAmount: c.targetAmount,
        beneficiary: c.beneficiary,
        visibility: "PUBLIQUE",
        isTontine: Boolean((c as any).isTontine),
        moderationStatus: "APPROVED",
        qrCodeDataUrl,
      },
    });
  }
  console.log(`Seeded ${CAMPAIGNS.length} demo campaigns.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
