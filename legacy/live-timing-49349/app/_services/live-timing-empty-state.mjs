export function emptyStandingsPresentation(serverStatus) {
  if (serverStatus === "online") {
    return {
      mode: "waiting",
      title: "En attente du classement",
      description: "Le serveur est en ligne; le classement apparaîtra dès que des participants rejoindront la session.",
    };
  }

  return {
    mode: "unavailable",
    title: "Aucune donnée de classement disponible",
    description: "Le classement apparaîtra automatiquement lorsque la session sera active.",
  };
}
