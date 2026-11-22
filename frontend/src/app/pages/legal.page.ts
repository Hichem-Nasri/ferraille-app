import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

const CONTACT_EMAIL = 'nasri.hichem.pro@gmail.com';

@Component({
  selector: 'fr-privacy-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="page legal">
      <h1>Politique de confidentialité</h1>
      <p class="muted">Dernière mise à jour : 22 novembre 2026</p>

      <h2>Qui sommes-nous ?</h2>
      <p>Ferraille (ferraille-tn.com) est une plateforme gratuite de petites annonces de pièces auto d'occasion en Tunisie. Elle met en relation des vendeurs (particuliers et casses) et des acheteurs, qui se contactent directement.</p>

      <h2>Données collectées</h2>
      <ul>
        <li><strong>Connexion avec Facebook :</strong> ton identifiant Facebook propre à Ferraille, ton nom, ta photo de profil et ton adresse e-mail si tu l'autorises. Nous ne publions jamais rien sur ton compte et n'accédons ni à tes amis ni à tes messages.</li>
        <li><strong>Profil :</strong> ville, numéro WhatsApp, téléphone, lien Facebook ou Messenger, nom de la casse. Ces informations sont affichées sur tes annonces pour que les acheteurs puissent te contacter.</li>
        <li><strong>Annonces :</strong> photos, description, prix, véhicules compatibles.</li>
        <li><strong>Statistiques :</strong> nombre de vues et de clics sur les boutons de contact de chaque annonce.</li>
      </ul>

      <h2>Utilisation</h2>
      <p>Ces données servent uniquement à faire fonctionner le service : afficher tes annonces, te permettre de te connecter et permettre aux acheteurs de te joindre. Elles ne sont ni vendues ni partagées à des fins publicitaires.</p>

      <h2>Conservation et suppression</h2>
      <p>Tes données sont conservées tant que ton compte existe. Tu peux supprimer ton compte et toutes tes annonces à tout moment depuis ton profil. Voir aussi <a routerLink="/suppression-donnees">la page de suppression des données</a>.</p>

      <h2>Contact</h2>
      <p>Pour toute question : <a [href]="'mailto:' + email">{{ email }}</a></p>
    </article>
  `,
  styles: `
    .legal { line-height: 1.6; font-size: 15px; }
    h1 { font-size: 28px; }
    h2 { font-size: 18px; margin-top: 8px; }
    p, ul { margin: 0; color: var(--ink-2); }
    li { margin-bottom: 6px; }
  `,
})
export class PrivacyPage {
  readonly email = CONTACT_EMAIL;
}

@Component({
  selector: 'fr-data-deletion-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="page legal">
      <h1>Supprimer tes données</h1>
      <p>Tu peux supprimer ton compte Ferraille et toutes les données associées à tout moment :</p>
      <ol>
        <li>Connecte-toi sur <a routerLink="/connexion">ferraille-tn.com</a> (avec Facebook ou ton e-mail).</li>
        <li>Ouvre <a routerLink="/profil">ton profil</a>.</li>
        <li>Clique sur « Supprimer mon compte et mes annonces » et confirme.</li>
      </ol>
      <p>Ton nom, ta photo, ton e-mail, tes numéros, ton lien Facebook et ton identifiant Facebook sont effacés immédiatement, et toutes tes annonces sont retirées du site.</p>
      <p>Tu peux aussi retirer l'accès de Ferraille depuis Facebook : Paramètres › Applications et sites web › Ferraille › Supprimer.</p>
      <p>Si tu ne peux plus te connecter, écris-nous à <a [href]="'mailto:' + email">{{ email }}</a> : la suppression est faite sous 7 jours.</p>
    </article>
  `,
  styles: `
    .legal { line-height: 1.6; font-size: 15px; }
    h1 { font-size: 28px; }
    p, ol { margin: 0; color: var(--ink-2); }
    li { margin-bottom: 6px; }
  `,
})
export class DataDeletionPage {
  readonly email = CONTACT_EMAIL;
}
