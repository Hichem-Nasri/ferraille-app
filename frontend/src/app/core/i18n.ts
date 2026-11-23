import { DOCUMENT } from '@angular/common';
import { Injectable, Pipe, PipeTransform, inject, signal } from '@angular/core';

export type Lang = 'fr' | 'ar';

const LANG_KEY = 'ferraille.lang';

const AR: Record<string, string> = {
  'Pièces': 'القطع',
  'Accueil': 'الرئيسية',
  'Annonces': 'إعلاناتي',
  'Profil': 'حسابي',
  'Mes annonces': 'إعلاناتي',
  'Connexion': 'دخول',
  'Admin': 'الإدارة',
  'Groupe Facebook': 'مجموعة فيسبوك',
  'Vendre une pièce': 'بيع قطعة',
  'Vendre': 'بيع',
  'Demandes': 'الطلبات',
  'Casses': 'الكسّارات',
  'Alertes': 'التنبيهات',
  "Pièces auto d'occasion en Tunisie": 'قطع غيار سيارات مستعملة في تونس',
  'Phare 208, jante 16″, démarreur…': 'فنار 208، جانت 16، ديماراور…',
  'Mon garage': 'سيارتي',
  'Ajoute ta voiture pour filtrer': 'أضف سيارتك لتصفية النتائج',
  'Changer': 'تغيير',
  'Ajouter': 'إضافة',
  'Marque': 'الماركة',
  'Modèle': 'الموديل',
  'Année': 'السنة',
  'Choisir': 'اختر',
  'Retirer': 'حذف',
  'Enregistrer': 'حفظ',
  'Catégories': 'الأصناف',
  'Une pièce qui dort dans ton garage ?': 'عندك قطعة مخبّية في الگاراج؟',
  'Publie gratuitement en 2 minutes. Les acheteurs te contactent directement sur WhatsApp.': 'انشرها مجاناً في دقيقتين. الشاري يتصل بيك مباشرة على واتساب.',
  'Dernières pièces': 'آخر القطع',
  'Chargement…': 'جاري التحميل…',
  'Aucune pièce trouvée pour le moment.': 'ما فماش قطع حالياً.',
  'Voir plus': 'المزيد',
  'Tu ne trouves pas ta pièce ?': 'ما لقيتش القطعة؟',
  'Publie une demande : les casses qui ont ta marque la voient et te contactent.': 'انشر طلب: الكسّارات اللي عندهم الماركة متاعك يشوفوه ويتصلوا بيك.',
  'Publier une demande': 'انشر طلب',
  'Créer une alerte': 'أنشئ تنبيه',
  'Sois prévenu dès qu’une pièce correspondante est publiée.': 'تتنبّه كي تتنشر قطعة تناسبك.',
  'Casses près de chez moi': 'كسّارات قريبة مني',
  'Toutes les villes': 'كل الولايات',
  'Ville': 'الولاية',
  'Casse vérifiée': 'كسّار موثّق',
  'Vérifiée': 'موثّق',
  'À la une': 'مميّز',
  'annonces': 'إعلانات',
  'avis': 'تقييمات',
  'Itinéraire': 'الاتجاهات',
  'Appeler': 'اتصل',
  'Voir la casse': 'شوف الكسّار',
  'Aucune casse dans cette ville pour le moment.': 'ما فماش كسّارات في الولاية هذي حالياً.',
  'Demandes de pièces': 'طلبات القطع',
  'Je cherche une pièce': 'نلوّج على قطعة',
  'Décris la pièce': 'وصف القطعة',
  'Publier': 'انشر',
  'Pour mes marques': 'لماركاتي',
  'Toutes': 'الكل',
  'Mes demandes': 'طلباتي',
  'Fermer': 'سكّر',
  'Je l’ai': 'عندي هي',
  'Aucune demande ouverte.': 'ما فماش طلبات مفتوحة.',
  'Mes alertes': 'تنبيهاتي',
  'nouvelle(s)': 'جديدة',
  'Voir': 'شوف',
  'Supprimer': 'حذف',
  'Aucune alerte. Crée-en une depuis la recherche.': 'ما عندكش تنبيهات. أنشئ واحد من البحث.',
  'Avis des clients': 'آراء الحرفاء',
  'Laisser un avis': 'اترك تقييم',
  'Envoyer': 'ابعث',
  'Ton commentaire (facultatif)': 'تعليقك (اختياري)',
  'Merci pour ton avis !': 'شكراً على تقييمك!',
  'Aucun avis pour le moment.': 'ما فماش تقييمات حالياً.',
  'Horaires': 'التوقيت',
  'Adresse': 'العنوان',
  'Pièces en vente': 'القطع المعروضة',
  'Publication express': 'نشر سريع',
  'Ajouter une ligne': 'زيد سطر',
  'Tout publier': 'انشر الكل',
  'Prix (DT)': 'السوم (د.ت)',
  'Catégorie': 'الصنف',
  'État': 'الحالة',
  'Photo': 'صورة',
  'Prix à discuter': 'السوم بالتفاهم',
  'Particulier': 'خاص',
  'Casse / professionnel': 'كسّار / محترف',
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);
  readonly lang = signal<Lang>(readLang());

  constructor() {
    this.apply();
  }

  toggle(): void {
    this.set(this.lang() === 'fr' ? 'ar' : 'fr');
  }

  set(lang: Lang): void {
    this.lang.set(lang);
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      return this.apply();
    }
    this.apply();
  }

  t(text: string): string {
    return this.lang() === 'ar' ? AR[text] ?? text : text;
  }

  private apply(): void {
    const html = this.document.documentElement;
    html.lang = this.lang() === 'ar' ? 'ar-TN' : 'fr';
    html.dir = this.lang() === 'ar' ? 'rtl' : 'ltr';
  }
}

function readLang(): Lang {
  try {
    return localStorage.getItem(LANG_KEY) === 'ar' ? 'ar' : 'fr';
  } catch {
    return 'fr';
  }
}

@Pipe({ name: 't', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(text: string): string {
    return this.i18n.t(text);
  }
}
