# Volleyball Team Manager

Eine Progressive Web App zur Verwaltung von Volleyball-Teams und zur Integration von Jugendspielern in den Herrenbereich.

## Projektbeschreibung

Diese Anwendung wurde entwickelt, um die Zusammenarbeit innerhalb einer Volleyballabteilung zu verbessern. Sie unterstützt Trainer bei der Trainingsplanung und im Teammanagement und erleichtert Jugendspielern den Übergang in höhere Mannschaften.

Die Plattform vernetzt alle Teams der Abteilung miteinander und ermöglicht die Koordination von Trainingsgästen aus unteren Mannschaften. Ein integriertes Planungsmodul erleichtert zusätzlich die Trainingsgestaltung, indem es eine saisonübergreifende Übersicht bereitstellt.

## Hauptfunktionen

### Für Trainer
- Trainings und Spiele planen und verwalten
- Spieler zu Trainings und Spielen einladen
- Spielerattribute und -entwicklung verfolgen
- Jugendspieler in höhere Teams integrieren
- Teamübergreifende Koordination

### Für Spieler
- Zu Trainings und Spielen zu- oder absagen
- Eigene Termine und Teams einsehen
- Profil verwalten

### Für Jugendspieler
- Nahtloser Übergang in den Herrenbereich
- Teilnahme an Trainings höherer Teams
- Entwicklungspfad verfolgen

## Technologien

### Frontend
- React.js
- Material UI
- Progressive Web App (PWA)
- Responsive Design für mobile Nutzung

### Backend
- Node.js mit Express
- MongoDB Datenbank
- JWT für Authentifizierung
- RESTful API

## Installation und Einrichtung

### Voraussetzungen
- Node.js (v14 oder höher)
- MongoDB (lokal oder Remote)
- npm oder yarn

### Installation

1. Repository klonen
```bash
git clone https://github.com/yourusername/volleyball-app.git
cd volleyball-app
```

2. Abhängigkeiten installieren
```bash
# Backend-Abhängigkeiten installieren
cd server
npm install

# Frontend-Abhängigkeiten installieren
cd ../client
npm install
```

3. Umgebungsvariablen konfigurieren
```bash
# Im Hauptverzeichnis
cp .env.example .env
# Bearbeiten Sie die .env-Datei mit Ihren eigenen Werten
```

4. Datenbank einrichten
```bash
# MongoDB starten (falls lokal)
mongod
```

5. Anwendung starten
```bash
# Backend starten
cd server
npm run dev

# Frontend starten (in einem neuen Terminal)
cd ../client
npm start
```

Die Anwendung ist nun unter http://localhost:3000 verfügbar.

## Benutzertypen

Die Anwendung unterstützt drei Arten von Benutzern mit unterschiedlichen Berechtigungen und Benutzeroberflächen:

1. **Trainer**: Vollständiger Zugriff auf alle Teams, kann Termine erstellen, Spieler nominieren und Attribute verwalten.
2. **Spieler**: Kann zu Trainings oder Spielen zu- oder absagen und seine Teams einsehen.
3. **Jugendspieler**: Wie ein normaler Spieler, aber mit spezieller Kennzeichnung für Spieler, deren Alter in diesem oder nächstem Jahr 20 überschreitet.

## Projektstruktur

```
volleyball-app/
├── client/                 # Frontend (React)
│   ├── public/             # Statische Dateien
│   └── src/                # React-Quellcode
│       ├── components/     # UI-Komponenten
│       ├── context/        # React Context für Zustandsverwaltung
│       └── pages/          # Seitenkomponenten
├── server/                 # Backend (Node.js/Express)
│   ├── controllers/        # API-Controller
│   ├── models/             # Mongoose-Modelle
│   ├── routes/             # API-Routen
│   └── middleware/         # Express-Middleware
└── .env.example            # Beispiel für Umgebungsvariablen
```

## Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert.

## Kontakt

Bei Fragen oder Anregungen wenden Sie sich bitte an moritz.klement@fau.de