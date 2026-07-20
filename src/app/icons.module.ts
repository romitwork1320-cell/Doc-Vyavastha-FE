import { NgModule } from '@angular/core';
import { TablerIconsModule } from 'angular-tabler-icons';
import {
  // --- Sidebar Icons (You already had these) ---
  IconLayoutDashboard,
  IconTruckDelivery,
  IconFileText,
  IconArrowsLeftRight,
  IconPuzzle,
  IconPhoto,
  IconAddressBook,
  IconBuildingStore,
  IconBox,
  IconUser,
  IconBuilding,
  IconBug,
  IconCreditCard,
  IconUserCircle,
  IconSettings,
  IconActivity,
  IconX,
  IconMagnet,
  IconLayoutKanban,
  IconCheckbox,
  IconUsers,
  IconShield,
  IconHome,

  // --- 🔥 NEW: Header & Action Icons (Add these) ---
  IconMenu2,           // Hamburger Menu
  IconSearch,          // Search Magnifier
  IconCircleX,         // Close/Clear Search
  IconAlertTriangle,   // Subscription Warning
  IconFileImport,      // Import Button
  IconFileSpreadsheet, // Export Button
  IconFilter,          // Filter (Empty)
  IconFilterFilled,    // Filter (Active)
  IconChevronDown,     // Profile Dropdown Arrow
  IconPower,           // Logout (often used in profile menus)
  IconDots,             // Menu Dots
  IconFileTypePdf,
  IconArrowRight,
  IconDeviceDesktop,
  IconFolderOff,
  IconHistory,
  IconNote,
  IconPencil,
  IconPhone,
  IconRotateClockwise,
  IconBriefcase,
  IconClipboardList,
  IconMapPin,
  IconTools,
  IconBuildingWarehouse,
  IconRecycle,
  IconTrash,
  IconTrashOff,
  IconChevronUp,
  IconBrandWhatsapp,
  IconHeadset,
  IconBell,
  IconTicket,
  IconMessageDots,
  // --- Billing Icons ---
  IconShoppingCart,
  IconCash,
  IconReceipt,
  IconReceipt2,
  IconReceiptTax,
  IconFileInvoice,
  IconPlus,
  IconPackage,
  IconPackageOff,
  IconEdit,
  IconInfoCircle,
  IconHash,
  IconNotes,
  IconTag,
  IconListDetails,
  IconCircleCheck,
  IconMail,
  IconArrowLeft,
  IconSchool,
  IconCertificate,
  IconFileInfo,
  IconFolderOpen,
  IconCategory,
  IconListNumbers,
  IconStatusChange
} from 'angular-tabler-icons/icons';

const icons = {
  // Sidebar
  IconLayoutDashboard,
  IconTruckDelivery,
  IconFileText,
  IconArrowsLeftRight,
  IconPuzzle,
  IconPhoto,
  IconAddressBook,
  IconBuildingStore,
  IconBox,
  IconUser,
  IconBuilding,
  IconBug,
  IconCreditCard,
  IconUserCircle,
  IconSettings,
  IconActivity,
  IconX,
  IconMagnet,
  IconLayoutKanban,
  IconCheckbox,
  IconUsers,
  IconShield,
  IconHome,

  // Header & Actions
  IconMenu2,
  IconSearch,
  IconCircleX,
  IconAlertTriangle,
  IconFileImport,
  IconFileSpreadsheet,
  IconFilter,
  IconFilterFilled,
  IconChevronDown,
  IconPower,
  IconDots,
  IconFileTypePdf,
  IconDeviceDesktop,
  IconRotateClockwise,
  IconPencil,
  IconHistory,
  IconPhone,
  IconArrowRight,
  IconNote,
  IconFolderOff,
  IconTools,
  IconMapPin,
  IconBriefcase,
  IconClipboardList,
  IconBuildingWarehouse,
  IconRecycle,
  IconTrash,
  IconTrashOff,
  IconChevronUp,
  IconBrandWhatsapp,
  IconHeadset,
  IconBell,
  IconTicket,
  IconMessageDots,
  // Billing
  IconShoppingCart,
  IconCash,
  IconReceipt,
  IconReceipt2,
  IconReceiptTax,
  IconFileInvoice,
  IconPlus,
  IconPackage,
  IconPackageOff,
  IconEdit,
  IconInfoCircle,
  IconHash,
  IconNotes,
  IconTag,
  IconListDetails,
  IconCircleCheck,
  IconMail,
  IconArrowLeft,
  IconSchool,
  IconCertificate,
  IconFileInfo,
  IconFolderOpen,
  IconCategory,
  IconListNumbers,
  IconStatusChange
};

@NgModule({
  imports: [
    TablerIconsModule.pick(icons)
  ],
  exports: [
    TablerIconsModule
  ]
})
export class IconsModule { }