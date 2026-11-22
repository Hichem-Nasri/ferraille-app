package tn.ferraille.demo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tn.ferraille.config.FerrailleProperties;
import tn.ferraille.listing.Category;
import tn.ferraille.listing.Listing;
import tn.ferraille.listing.ListingRepository;
import tn.ferraille.listing.PartCondition;
import tn.ferraille.listing.VehicleFit;
import tn.ferraille.user.Role;
import tn.ferraille.user.SellerType;
import tn.ferraille.user.User;
import tn.ferraille.user.UserRepository;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final FerrailleProperties properties;
    private final UserRepository userRepository;
    private final ListingRepository listingRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${ferraille.owner-password:}")
    private String ownerPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        createAdmin();
        if (properties.demoData() && listingRepository.count() == 0) {
            createDemoData();
        }
    }

    private void createAdmin() {
        String email = properties.adminEmail();
        String password = properties.adminPassword();
        if (email == null || email.isBlank() || password == null || password.isBlank()
                || userRepository.existsByEmailIgnoreCase(email)) {
            return;
        }
        User admin = user("Administrateur Ferraille", email, "Tunis", SellerType.PARTICULIER, null, password);
        admin.setRole(Role.ADMIN);
        admin.setVerified(true);
        userRepository.save(admin);
        log.info("Compte administrateur créé : {}", email);
    }

    private void createDemoData() {
        User casse = user("Mourad Ben Ali", "casse@demo.ferraille.tn", "Tunis", SellerType.PRO, "Casse Moncef Bey", "demo12345");
        casse.setVerified(true);
        casse.setPhone("+216 71 000 000");
        User karim = user("Karim", "karim@demo.ferraille.tn", "Sousse", SellerType.PARTICULIER, null, "demo12345");
        karim.setPhone("+216 98 000 000");
        User acheteur = user("Sami", "sami@demo.ferraille.tn", "Sfax", SellerType.PARTICULIER, null, "demo12345");
        acheteur.setPhone("+216 55 000 000");
        userRepository.saveAll(List.of(casse, karim, acheteur));

        String password = ownerPassword;
        if (password == null || password.isBlank()) {
            byte[] bytes = new byte[12];
            new SecureRandom().nextBytes(bytes);
            password = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
            log.warn("Mot de passe provisoire du compte nasri.hichem.pro@gmail.com : {} (définis OWNER_PASSWORD pour le choisir)", password);
        }
        User hichem = user("Hichem Nasri", "nasri.hichem.pro@gmail.com", "Tunis", SellerType.PARTICULIER, null, password);
        hichem.setVerified(true);
        userRepository.save(hichem);

        listingRepository.saveAll(List.of(
                listing(hichem, "Disque et étrier de frein avant", Category.FREINAGE, PartCondition.TRES_BON, "140", true, "Tunis",
                        "Disque ventilé et étrier démontés d'un véhicule à faible kilométrage. Plaquettes à 70 %.",
                        photos(34277926), new VehicleFit("Peugeot", "301", 2012, 2020), new VehicleFit("Citroën", "C-Elysée", 2012, 2020)),
                listing(hichem, "Alternateur révisé 12V", Category.ELECTRICITE, PartCondition.BON, "260", true, "Tunis",
                        "Alternateur testé et révisé en atelier : charbons et roulements neufs.",
                        photos(16048266), new VehicleFit("Renault", "Clio 4", 2013, 2019), new VehicleFit("Dacia", "Logan", 2012, 2020)),
                listing(hichem, "Turbo à réviser", Category.MOTEUR, PartCondition.POUR_PIECES, "350", true, "Tunis",
                        "Turbo démonté, léger jeu dans l'axe. Idéal pour révision ou échange standard.",
                        photos(7565160), new VehicleFit("Volkswagen", "Golf 7", 2013, 2020), new VehicleFit("Seat", "Leon", 2013, 2020)),
                listing(hichem, "Bloc moteur 1.6 complet", Category.MOTEUR, PartCondition.BON, "2900", true, "Tunis",
                        "Moteur complet avec accessoires, 128 000 km. Compression vérifiée, démarrage possible sur place.",
                        photos(6517339, 19499386), new VehicleFit("Peugeot", "208", 2012, 2019), new VehicleFit("Peugeot", "2008", 2013, 2019)),
                listing(hichem, "Arbre à cames avec ressorts de soupapes", Category.MOTEUR, PartCondition.TRES_BON, "180", false, "Tunis",
                        "Arbre à cames et ressorts en bon état, sans usure visible sur les cames.",
                        photos(29226618), new VehicleFit("Renault", "Mégane 3", 2008, 2016)),
                listing(hichem, "Lot de 4 jantes alu 16″", Category.JANTES_PNEUS, PartCondition.BON, "780", true, "Tunis",
                        "Quatre jantes alliage, entraxe 5x112. Pas de voile, quelques traces de trottoir.",
                        photos(36202185, 5661682), new VehicleFit("Volkswagen", "Golf 7", 2013, 2020), new VehicleFit("Skoda", "Octavia", 2013, 2020)),
                listing(hichem, "Jantes avec pneus montés", Category.JANTES_PNEUS, PartCondition.BON, "650", true, "Tunis",
                        "Pneus 205/55 R16 à 60 %, montés et équilibrés.",
                        photos(34357287), new VehicleFit("Kia", "Cerato", 2013, 2018), new VehicleFit("Hyundai", "Elantra", 2011, 2016)),
                listing(hichem, "Rétroviseur extérieur chromé", Category.CARROSSERIE, PartCondition.TRES_BON, "110", true, "Tunis",
                        "Rétroviseur électrique complet, coque chromée sans rayure.",
                        photos(7540400), new VehicleFit("Volkswagen", "Passat", 2011, 2015)),
                listing(hichem, "Feu arrière LED droit", Category.ECLAIRAGE, PartCondition.TRES_BON, "190", true, "Tunis",
                        "Feu complet avec platine, toutes les LED fonctionnent. Fixations intactes.",
                        photos(31471862), new VehicleFit("Hyundai", "Tucson", 2015, 2020)),
                listing(hichem, "Phare avant LED gauche", Category.ECLAIRAGE, PartCondition.BON, "420", true, "Tunis",
                        "Phare d'origine, optique claire sans buée. Une patte de fixation recollée.",
                        photos(16352272), new VehicleFit("Kia", "Sportage", 2016, 2021)),
                listing(hichem, "Paire de sièges avant cuir", Category.INTERIEUR, PartCondition.TRES_BON, "1200", true, "Tunis",
                        "Sièges cuir beige avec rails, chauffants. Aucune déchirure.",
                        photos(5507145), new VehicleFit("Mercedes", "Classe C", 2014, 2020)),
                listing(hichem, "Lot de pièces d'échappement", Category.AUTRE, PartCondition.BON, "220", true, "Tunis",
                        "Silencieux, tubes intermédiaires et colliers. Vendu en lot ou au détail.",
                        photos(34133277), new VehicleFit("Renault", "Symbol", 2008, 2016), new VehicleFit("Renault", "Clio 3", 2005, 2012)),
                listing(casse, "Phare avant gauche LED", Category.ECLAIRAGE, PartCondition.TRES_BON, "180", true, "Tunis",
                        "Phare d'origine démonté d'une 208 accidentée à l'arrière. Aucun choc, fixations intactes.",
                        photos(30849335), new VehicleFit("Peugeot", "208", 2012, 2019)),
                listing(karim, "4 jantes alu 15″ d'origine", Category.JANTES_PNEUS, PartCondition.BON, "520", true, "Sousse",
                        "Entraxe 4x108. Petites rayures de trottoir sur une jante.",
                        photos(4056596), new VehicleFit("Peugeot", "208", 2012, 2019), new VehicleFit("Citroën", "C3", 2009, 2016)),
                listing(karim, "Rétroviseur droit électrique", Category.CARROSSERIE, PartCondition.TRES_BON, "95", false, "Sousse",
                        "Rétroviseur complet avec moteur et clignotant.",
                        photos(16454086), new VehicleFit("Kia", "Rio", 2017, 2020)),
                listing(casse, "Disque de frein usé, pour pièces", Category.FREINAGE, PartCondition.POUR_PIECES, "25", false, "Ben Arous",
                        "Disque et étrier oxydés, à rectifier ou pour récupération.",
                        photos(8651900), new VehicleFit("Renault", "Clio 4", 2013, 2019)),
                listing(casse, "Portières d'occasion, plusieurs couleurs", Category.CARROSSERIE, PartCondition.BON, "310", true, "Tunis",
                        "Stock de portières avant et arrière. Indique ton modèle et ta couleur, on vérifie la disponibilité.",
                        photos(35503906, 35503910), new VehicleFit("Volkswagen", "Golf 7", 2013, 2020), new VehicleFit("Peugeot", "301", 2012, 2020)),
                listing(casse, "Moteur essence complet à reconditionner", Category.MOTEUR, PartCondition.POUR_PIECES, "1500", true, "Tunis",
                        "Moteur complet vendu en l'état, idéal pour pièces ou reconditionnement.",
                        photos(14615706), new VehicleFit("Toyota", "Corolla", 2002, 2007))));
        log.info("Données de démonstration créées");
    }

    private User user(String name, String email, String city, SellerType type, String shop, String password) {
        User u = new User();
        u.setFullName(name);
        u.setEmail(email);
        u.setCity(city);
        u.setSellerType(type);
        u.setShopName(shop);
        u.setPasswordHash(passwordEncoder.encode(password));
        return u;
    }

    private static List<String> photos(long... ids) {
        List<String> urls = new ArrayList<>();
        for (long id : ids) {
            urls.add("https://images.pexels.com/photos/" + id + "/pexels-photo-" + id + ".jpeg?auto=compress&cs=tinysrgb&w=900");
        }
        return urls;
    }

    private Listing listing(User seller, String title, Category category, PartCondition condition, String price,
                            boolean negotiable, String city, String description, List<String> photos,
                            VehicleFit... fits) {
        Listing l = new Listing();
        l.setSeller(seller);
        l.setTitle(title);
        l.setCategory(category);
        l.setCondition(condition);
        l.setPrice(new BigDecimal(price).setScale(3));
        l.setNegotiable(negotiable);
        l.setCity(city);
        l.setDescription(description);
        l.setPhotos(new ArrayList<>(photos));
        l.setFits(new ArrayList<>(List.of(fits)));
        return l;
    }
}
