/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Equipe from './pages/Equipe';
import EquipeCommunication from './pages/EquipeCommunication';
import EquipeEvangelisation from './pages/EquipeEvangelisation';
import EquipeFI from './pages/EquipeFI';
import EquipeFormation from './pages/EquipeFormation';
import EquipeGouvernance from './pages/EquipeGouvernance';
import EquipeTrone from './pages/EquipeTrone';
import EvangelisationAnalyse from './pages/EvangelisationAnalyse';
import EvangelisationRadar from './pages/EvangelisationRadar';
import CommunicationDirectives from './pages/CommunicationDirectives';
import CommunicationKanban from './pages/CommunicationKanban';
import GouvAllocation from './pages/GouvAllocation';
import GouvBilan from './pages/GouvBilan';
import GouvMatrice from './pages/GouvMatrice';
import GouvModelisation from './pages/GouvModelisation';
import Home from './pages/Home';
import MonProfil from './pages/MonProfil';
import TroneArchives from './pages/TroneArchives';
import TroneRadar from './pages/TroneRadar';
import TroneValidation from './pages/TroneValidation';
import FIHub from './pages/FIHub';
import FormationAssiduite from './pages/FormationAssiduite';
import FormationBulletin from './pages/FormationBulletin';
import FormationCorrection from './pages/FormationCorrection';
import FormationSalle from './pages/FormationSalle';
import EvangelisationDebrief from './pages/EvangelisationDebrief';
import EvangelisationROI from './pages/EvangelisationROI';
import CommunicationFunnel from './pages/CommunicationFunnel';
import Parametres from './pages/Parametres';
import GouvDonnees from './pages/GouvDonnees';
import FIClinique from './pages/FIClinique';
import FIDashboard from './pages/FIDashboard';
import FIDossiers from './pages/FIDossiers';
import FIManager from './pages/FIManager';
import FITourControle from './pages/FITourControle';
import FITransferts from './pages/FITransferts';
import GouvAnomalies from './pages/GouvAnomalies';
import GouvMasterPlan from './pages/GouvMasterPlan';
import GouvRedaction from './pages/GouvRedaction';
import GouvRoadmap from './pages/GouvRoadmap';
import FormationLabo from './pages/FormationLabo';
import EvangelisationHeatmap from './pages/EvangelisationHeatmap';
import CommunicationBibliotheque from './pages/CommunicationBibliotheque';
import Messagerie from './pages/Messagerie';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Equipe": Equipe,
    "EquipeCommunication": EquipeCommunication,
    "EquipeEvangelisation": EquipeEvangelisation,
    "EquipeFI": EquipeFI,
    "EquipeFormation": EquipeFormation,
    "EquipeGouvernance": EquipeGouvernance,
    "EquipeTrone": EquipeTrone,
    "EvangelisationAnalyse": EvangelisationAnalyse,
    "EvangelisationRadar": EvangelisationRadar,
    "CommunicationDirectives": CommunicationDirectives,
    "CommunicationKanban": CommunicationKanban,
    "GouvAllocation": GouvAllocation,
    "GouvBilan": GouvBilan,
    "GouvMatrice": GouvMatrice,
    "GouvModelisation": GouvModelisation,
    "Home": Home,
    "MonProfil": MonProfil,
    "TroneArchives": TroneArchives,
    "TroneRadar": TroneRadar,
    "TroneValidation": TroneValidation,
    "FIHub": FIHub,
    "FormationAssiduite": FormationAssiduite,
    "FormationBulletin": FormationBulletin,
    "FormationCorrection": FormationCorrection,
    "FormationSalle": FormationSalle,
    "EvangelisationDebrief": EvangelisationDebrief,
    "EvangelisationROI": EvangelisationROI,
    "CommunicationFunnel": CommunicationFunnel,
    "Parametres": Parametres,
    "GouvDonnees": GouvDonnees,
    "FIClinique": FIClinique,
    "FIDashboard": FIDashboard,
    "FIDossiers": FIDossiers,
    "FIManager": FIManager,
    "FITourControle": FITourControle,
    "FITransferts": FITransferts,
    "GouvAnomalies": GouvAnomalies,
    "GouvMasterPlan": GouvMasterPlan,
    "GouvRedaction": GouvRedaction,
    "GouvRoadmap": GouvRoadmap,
    "FormationLabo": FormationLabo,
    "EvangelisationHeatmap": EvangelisationHeatmap,
    "CommunicationBibliotheque": CommunicationBibliotheque,
    "Messagerie": Messagerie,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};