# Inventaire de restauration B404 — point de sauvegarde du 2026-09-27

Ce document accompagne le point de sauvegarde GitHub global. Il décrit le périmètre contrôlé, les copies locales, les branches de sauvegarde prévues et les éléments qui restent volontairement hors GitHub.

## Règles de la sauvegarde

- Aucune fusion, aucun reset, aucun nettoyage et aucun push forcé.
- Les fichiers existants sont conservés tels qu'ils étaient au contrôle ; la sauvegarde ne modifie pas le contenu des BAT et ne redémarre aucun service.
- Les fichiers modifiés suivis et les fichiers nouveaux de source, tests, documentation, configurations et historiques utiles sont inclus lorsqu'ils sont dans un dépôt Git.
- Les environnements installés, caches, journaux, bases/runtime, déploiements générés et secrets ne sont pas poussés dans GitHub ; leur emplacement est indiqué ci-dessous.
- Les valeurs sensibles ne sont pas copiées dans cet inventaire et sont désignées par `[REDACTED]` lorsqu'une référence est nécessaire.

## Dépôts GitHub sauvegardés

### `thecrow24fr/b404-racecontrol`

- Copie locale : `D:\B404\Apps\Git\B404-RaceControl`
- Point de départ contrôlé : `main`, HEAD `ef174d11f34d3edd0ae39e3f7db4c82140672a23`
- Contenu : application RaceControl, Live Timing, flux SSE et API publiques, pages de résultats, composants d'interface, services, documentation et tests.
- Les modifications et fichiers nouveaux présents dans `app/`, `server/` et `tests/` sont sauvegardés.
- Le présent inventaire est ajouté sous `docs/`.
- Branche dédiée : `backup/b404-full-20260927-racecontrol`

### `thecrow24fr/b404-racecontrol-manager`

Deux copies locales distinctes pointent vers ce même dépôt GitHub. Elles sont sauvegardées sur deux branches différentes afin de ne perdre ni l'ancien clone ni la copie de travail actuelle.

#### Copie de travail Manager/Cockpit

- Copie locale : `D:\B404\Apps\Manager`
- Branche de départ : `feat/event-config`, HEAD `c37cc08ee3d6c219d3fd8875dab45d516da2b125`
- Contenu : Manager, Cockpit, `test-gd`, préparation Mod Prep, catalogue de circuits, météo, configurations, scripts, tests, rapports et historiques locaux du dépôt.
- Les modifications suivies et les sources/historiques nouveaux sont inclus. `start_manager.bat` est sauvegardé dans son état constaté, sans modification de contenu par cette opération.
- Branche dédiée : `backup/b404-full-20260927-manager-apps`

#### Clone Git historique

- Copie locale : `D:\B404\Apps\Git\B404-Manager`
- Branche de départ : `feat/event-config`, HEAD `3b2ddf4a59275eb68c4fc325f61d3cc292f4b4d8`
- Contenu : clone propre plus ancien du Manager, conservé séparément car son HEAD diffère de la branche distante observée.
- Branche dédiée : `backup/b404-full-20260927-manager-clone`

### `thecrow24fr/b404-site`

- Copie locale : `D:\B404\Apps\Git\B404-Site`
- Branche de départ : `ovh-static`, HEAD `4793933b8be3ff3ba64aa0621729b8f79fe30686`
- Contenu : source du site, assets, configuration et workflows déjà suivis par Git.
- Branche dédiée : `backup/b404-full-20260927-site`

## Dossiers B404 examinés mais sans dépôt GitHub local correspondant

Ces éléments ne sont pas silencieusement oubliés : ils restent à préserver localement ou dans leur mécanisme opérationnel propre.

- `D:\B404\Apps\B404-LiveTiming-IsolatedTest` — harnais Live isolé, fixtures et tests ; 7 fichiers, aucun `.git` détecté.
- `D:\B404\Apps\B404-Timing` — application timing, stockage, données et tests ; aucun `.git` détecté.
- `D:\B404\Apps\MergeEngine` — Merge Engine, domaines, providers et tests ; aucun `.git` détecté.
- `D:\B404\Apps\MergeEngine_backup_20260719_025145` — copie de sauvegarde locale du Merge Engine ; aucun dépôt GitHub associé identifié.
- `D:\B404\Apps\Proxy-API` — `proxy.mjs` et ses sauvegardes locales ; service/proxy runtime, aucun `.git` détecté.
- `D:\B404\Scripts` — scripts d'environnement et d'analyse, dont les BAT ; aucun `.git` détecté. Les BAT ne sont pas modifiés par la sauvegarde.
- `D:\B404\Config` — configurations Cloudflare/services et journaux associés ; aucun `.git` détecté.
- `D:\B404\Site\b404-racecontrol` — copie statique déployée `out` du RaceControl ; générée et servie localement, sa source est sauvegardée dans `b404-racecontrol`.
- `D:\B404\Site\b404-site` — copie/déploiement local du site ; sa source est sauvegardée dans `b404-site`.

## Données, runtime et contenu installé restant à préserver séparément

### Secrets et credentials

- `D:\B404\Secrets\B404-Apply\` — clé privée et clé publique d'application ; la clé privée n'est jamais stockée dans GitHub.
- `D:\B404\Config\cloudflare\` — configurations de tunnel et journaux pouvant contenir des informations sensibles ; contenu non copié dans GitHub, valeurs `[REDACTED]`.
- Les credentials présents dans les environnements de services et outils restent dans leur stockage sécurisé local/operational.

### Données locales et états runtime

- `D:\B404\Data\racecontrol.db`, `racecontrol.db-shm`, `racecontrol.db-wal` — base et fichiers SQLite runtime.
- `D:\B404\Data\test_gd\` — transactions, résultats et sauvegardes de tests `test-gd` liés à l'exécution.
- `D:\B404\Data\mod_prep\` — extractions, essais, assets et artefacts de préparation de mods.
- `D:\B404\Data\rfactor2\` — fichiers de travail liés à rFactor 2, setups/états et notes locales.
- `D:\B404\Logs\` — journaux API, Manager, Merge, rFactor 2, timing, environnement et système ; ils ne sont pas poussés car générés et potentiellement sensibles.
- Les fichiers `layout_cache.json`, `training_mode.json`, `veh_cache.json` et les révisions de catalogue présents dans la copie Manager sont traités avec la branche Manager selon leur présence dans le dépôt de travail ; les états produits directement par les services restent à conserver dans `D:\B404\Data\`.

### Environnements et dépendances installés

- `D:\B404\Apps\Manager\.venv\` — environnement Python installé, environ 50,8 MiB et 2 526 fichiers détectés ; non sauvegardé dans GitHub. Le code et les dépendances déclarées doivent être restaurés séparément.
- Caches et artefacts ignorés : `.hermes/`, `.pytest_cache/`, `__pycache__/`, `node_modules/`, `.next/`, `out/`, `tsconfig.tsbuildinfo` et équivalents.
- Les copies générées et sorties de build ne remplacent pas les sources GitHub ; elles restent dans les dossiers de déploiement locaux.

### rFactor 2 et serveurs

- Copie VM locale vérifiée : `D:\rfactor2-dedicated` — contenu installé, UserData, mods, véhicules, circuits, profils et états runtime non stockés dans GitHub.
- Chemin hôte de référence : `D:\B404_DEDICATED\SERVEURS\rfactor2-dedicated` — absent du volume contrôlé sur cette machine au moment de l'inventaire ; à retrouver sur l'hôte dédié correspondant.
- S20, R2LA, leurs processus, mémoires/états partagés, fichiers de lancement et données en cours restent dans leurs environnements d'exécution. Aucun service n'est arrêté ou redémarré par cette sauvegarde.

### Sauvegardes historiques hors dépôt

- `D:\B404\Backups\` — collection historique locale importante, comprenant des sauvegardes RaceControl, Manager, test-gd, catalogues, captures, documents et artefacts rFactor 2. Elle n'est pas copiée en bloc vers GitHub : volume, binaires, sorties générées et présence possible de données sensibles rendent ce stockage séparé nécessaire.
- Les historiques de code déjà présents sous `D:\B404\Apps\Manager\backups\` et `.phase_c_backup_20260812\` sont inclus dans la branche Manager lorsqu'ils sont des fichiers du dépôt de travail et ne contiennent pas de secret détecté.

## Périmètres séparés

- Les dossiers B404 qui ne sont pas sous `D:\B404` ou qui relèvent d'un autre projet ne sont pas mélangés à cette sauvegarde. En particulier, le périmètre B404 Porte Ouverte reste séparé selon la convention du projet.
- Aucun élément exclu ci-dessus ne doit être considéré comme sauvegardé par GitHub ; il doit être conservé sur son support runtime, de sauvegarde ou secret approprié.
