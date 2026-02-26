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
import CommunicationBibliotheque from './pages/CommunicationBibliotheque';
import CommunicationDirectives from './pages/CommunicationDirectives';
import CommunicationFunnel from './pages/CommunicationFunnel';
import CommunicationKanban from './pages/CommunicationKanban';
import EvangelisationDebrief from './pages/EvangelisationDebrief';
import EvangelisationHeatmap from './pages/EvangelisationHeatmap';
import EvangelisationROI from './pages/EvangelisationROI';
import EvangelisationRadar from './pages/EvangelisationRadar';
import FIClinique from './pages/FIClinique';
import FIDashboard from './pages/FIDashboard';
import FIDossiers from './pages/FIDossiers';
import FIManager from './pages/FIManager';
import FITourControle from './pages/FITourControle';
import FITransferts from './pages/FITransferts';
import FormationAssiduite from './pages/FormationAssiduite';
import FormationBulletin from './pages/FormationBulletin';
import FormationCorrection from './pages/FormationCorrection';
import FormationLabo from './pages/FormationLabo';
import FormationSalle from './pages/FormationSalle';
import GouvAllocation from './pages/GouvAllocation';
import GouvAnomalies from './pages/GouvAnomalies';
import GouvBilan from './pages/GouvBilan';
import GouvDonnees from './pages/GouvDonnees';
import GouvMasterPlan from './pages/GouvMasterPlan';
import GouvMatrice from './pages/GouvMatrice';
import GouvModelisation from './pages/GouvModelisation';
import GouvRedaction from './pages/GouvRedaction';
import GouvRoadmap from './pages/GouvRoadmap';
import Home from './pages/Home';
import Parametres from './pages/Parametres';
import TroneArchives from './pages/TroneArchives';
import TroneRadar from './pages/TroneRadar';
import TroneValidation from './pages/TroneValidation';
import EquipeTrone from './pages/EquipeTrone';
import EquipeGouvernance from './pages/EquipeGouvernance';
import EquipeFI from './pages/EquipeFI';
import EquipeFormation from './pages/EquipeFormation';
import EquipeEvangelisation from './pages/EquipeEvangelisation';
import EquipeCommunication from './pages/EquipeCommunication';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CommunicationBibliotheque": CommunicationBibliotheque,
    "CommunicationDirectives": CommunicationDirectives,
    "CommunicationFunnel": CommunicationFunnel,
    "CommunicationKanban": CommunicationKanban,
    "EvangelisationDebrief": EvangelisationDebrief,
    "EvangelisationHeatmap": EvangelisationHeatmap,
    "EvangelisationROI": EvangelisationROI,
    "EvangelisationRadar": EvangelisationRadar,
    "FIClinique": FIClinique,
    "FIDashboard": FIDashboard,
    "FIDossiers": FIDossiers,
    "FIManager": FIManager,
    "FITourControle": FITourControle,
    "FITransferts": FITransferts,
    "FormationAssiduite": FormationAssiduite,
    "FormationBulletin": FormationBulletin,
    "FormationCorrection": FormationCorrection,
    "FormationLabo": FormationLabo,
    "FormationSalle": FormationSalle,
    "GouvAllocation": GouvAllocation,
    "GouvAnomalies": GouvAnomalies,
    "GouvBilan": GouvBilan,
    "GouvDonnees": GouvDonnees,
    "GouvMasterPlan": GouvMasterPlan,
    "GouvMatrice": GouvMatrice,
    "GouvModelisation": GouvModelisation,
    "GouvRedaction": GouvRedaction,
    "GouvRoadmap": GouvRoadmap,
    "Home": Home,
    "Parametres": Parametres,
    "TroneArchives": TroneArchives,
    "TroneRadar": TroneRadar,
    "TroneValidation": TroneValidation,
    "EquipeTrone": EquipeTrone,
    "EquipeGouvernance": EquipeGouvernance,
    "EquipeFI": EquipeFI,
    "EquipeFormation": EquipeFormation,
    "EquipeEvangelisation": EquipeEvangelisation,
    "EquipeCommunication": EquipeCommunication,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};