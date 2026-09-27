# B404 Live Timing — test synthétique isolé

Ce répertoire est un harnais autonome de validation. Il ne modifie ni n'importe aucune application B404 existante.

## Garanties de périmètre

- Les fixtures sont entièrement synthétiques.
- Le faux serveur HTTP écoute seulement sur `127.0.0.1` et un port éphémère.
- Le code sous test refuse les endpoints qui ne sont pas loopback.
- Aucun appel n'est effectué vers S1_VM, le PC hôte, le Manager réel, le questionnaire, l'observateur ou le tunnel.
- Aucune base SQLite n'est utilisée.
- Les réponses d'erreur du faux serveur ne contiennent pas de données réelles.

## Exécution

Depuis ce répertoire :

```text
python -m unittest discover -s tests -v
```

La suite vérifie le contrat isolé : sources explicites, sélection sans découverte, normalisation du classement, états online/offline/stale, caches indépendants, filtrage des identifiants techniques et échappement HTML.
