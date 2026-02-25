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
import Home from './pages/Home';
import GouvAnomalies from './pages/GouvAnomalies';
import TroneRadar from './pages/TroneRadar';
import TroneValidation from './pages/TroneValidation';
import TroneArchives from './pages/TroneArchives';
import GouvMasterPlan from './pages/GouvMasterPlan';
import GouvAllocation from './pages/GouvAllocation';
import GouvRoadmap from './pages/GouvRoadmap';
import GouvDonnees from './pages/GouvDonnees';
import GouvBilan from './pages/GouvBilan';
import GouvMatrice from './pages/GouvMatrice';
import GouvModelisation from './pages/GouvModelisation';
import GouvRedaction from './pages/GouvRedaction';
import FIDashboard from './pages/FIDashboard';
import FITransferts from './pages/FITransferts';
import FormationSalle from './pages/FormationSalle';
import FormationLabo from './pages/FormationLabo';
import FormationBulletin from './pages/FormationBulletin';
import FormationCorrection from './pages/FormationCorrection';
import FormationAssiduite from './pages/FormationAssiduite';
import EvangelisationRadar from './pages/EvangelisationRadar';
import EvangelisationDebrief from './pages/EvangelisationDebrief';
import EvangelisationHeatmap from './pages/EvangelisationHeatmap';
import EvangelisationROI from './pages/EvangelisationROI';
import CommunicationKanban from './pages/CommunicationKanban';
import CommunicationBibliotheque from './pages/CommunicationBibliotheque';
import CommunicationFunnel from './pages/CommunicationFunnel';
import CommunicationDirectives from './pages/CommunicationDirectives';
import Parametres from './pages/Parametres';
import FIDossiers from './pages/FIDossiers';
import FITourControle from './pages/FITourControle';
import FIClinique from './pages/FIClinique';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "GouvAnomalies": GouvAnomalies,
    "TroneRadar": TroneRadar,
    "TroneValidation": TroneValidation,
    "TroneArchives": TroneArchives,
    "GouvMasterPlan": GouvMasterPlan,
    "GouvAllocation": GouvAllocation,
    "GouvRoadmap": GouvRoadmap,
    "GouvDonnees": GouvDonnees,
    "GouvBilan": GouvBilan,
    "GouvMatrice": GouvMatrice,
    "GouvModelisation": GouvModelisation,
    "GouvRedaction": GouvRedaction,
    "FIDashboard": FIDashboard,
    "FITransferts": FITransferts,
    "FormationSalle": FormationSalle,
    "FormationLabo": FormationLabo,
    "FormationBulletin": FormationBulletin,
    "FormationCorrection": FormationCorrection,
    "FormationAssiduite": FormationAssiduite,
    "EvangelisationRadar": EvangelisationRadar,
    "EvangelisationDebrief": EvangelisationDebrief,
    "EvangelisationHeatmap": EvangelisationHeatmap,
    "EvangelisationROI": EvangelisationROI,
    "CommunicationKanban": CommunicationKanban,
    "CommunicationBibliotheque": CommunicationBibliotheque,
    "CommunicationFunnel": CommunicationFunnel,
    "CommunicationDirectives": CommunicationDirectives,
    "Parametres": Parametres,
    "FIDossiers": FIDossiers,
    "FITourControle": FITourControle,
    "FIClinique": FIClinique,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};