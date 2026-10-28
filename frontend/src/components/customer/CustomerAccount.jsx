import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  User,
  MapPin,
  Mail,
  Share2,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Check,
  ChevronDown,
  X,
  Trash2,
  Plus,
  Edit2,
  Info,
  Sparkles,
  Award,
  Star,
  Gift,
  ShoppingBag,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  Package,
  Phone,
  Home,
  Briefcase,
  Tag,
} from "lucide-react";
import axios, { API } from "../../axios";

import HeaderContainer from "../common/HeaderContainer";
import Footer from "../common/Footer";
import { showSuccessToast, showErrorToast, showInfoToast } from "../../utils/toast";
import { getUserId } from "../../utils/userId";
import { useAppData } from "../../context/AppDataContext";
import { compressImageToBase64 } from "../../utils/imageCompressor";
import { hasActiveOrders, getCachedOrders, syncCustomerOrders } from "../../utils/ordersHelper";

// Comprehensive Cascading Philippine Location Data
const PH_LOCATION_DATA = {
  Laguna: {
    cities: {
      "Calamba City": {
        barangays: ["Uwisan", "Parian", "Canlubang", "Bucal", "Poblacion", "Real", "Halang", "Makiling", "Pansol", "Turbina", "Mayapa"],
        postalCode: "4027",
      },
      "Santa Rosa City": {
        barangays: ["Balibago", "Don Jose", "Dila", "Macabling", "Tagapo", "Sinalhan", "Malitlit", "Pulong Santa Cruz"],
        postalCode: "4026",
      },
      "Biñan City": {
        barangays: ["San Antonio", "San Vicente", "Platero", "De La Paz", "Malamig", "Canlalay", "Tubigan"],
        postalCode: "4024",
      },
      "San Pedro City": {
        barangays: ["San Antonio", "San Vicente", "Landayan", "Nueva", "Cuyab", "Pacita 1", "Pacita 2"],
        postalCode: "4023",
      },
      "Los Baños": {
        barangays: ["Batong Malake", "College", "Mayondon", "San Antonio", "Tadlac", "Bayog", "Anos"],
        postalCode: "4030",
      },
      "Cabuyao City": {
        barangays: ["Sala", "Niugan", "Banay-Banay", "Pulo", "Mamatid", "Gulod"],
        postalCode: "4025",
      },
    },
  },
  Cavite: {
    cities: {
      "Bacoor City": {
        barangays: ["Molino I", "Molino III", "Panapaan", "Talaba", "Habay", "Zapote", "Niog"],
        postalCode: "4102",
      },
      "Imus City": {
        barangays: ["Anabu I", "Anabu II", "Bucandala", "Malagasang", "Tanzang Luma", "Poblacion"],
        postalCode: "4103",
      },
      "Dasmariñas City": {
        barangays: ["Salawag", "Paliparan", "Langkaan", "San Jose", "Sampaloc", "Burol"],
        postalCode: "4114",
      },
      "General Trias": {
        barangays: ["Manggahan", "San Francisco", "Bacao", "Pasong Camachile", "Tejero"],
        postalCode: "4107",
      },
      "Tagaytay City": {
        barangays: ["Kaybagal", "Mendez Crossing", "Silang Junction", "Maharlika", "Sungay"],
        postalCode: "4120",
      },
    },
  },
  Batangas: {
    cities: {
      "Batangas City": {
        barangays: ["Alangilan", "Balagtas", "Kumintang Ilaya", "Kumintang Ibaba", "Poblacion", "Libjo"],
        postalCode: "4200",
      },
      "Lipa City": {
        barangays: ["Marawoy", "Sabang", "Tambong", "Banay-banay", "Lodlod", "Mataas na Lupa"],
        postalCode: "4217",
      },
      "Tanauan City": {
        barangays: ["Darasa", "Natatas", "Poblacion", "Sambat", "Trapiche", "Boot"],
        postalCode: "4232",
      },
      "Santo Tomas": {
        barangays: ["San Roque", "San Antonio", "Santiago", "San Pedro", "San Bartolome"],
        postalCode: "4234",
      },
    },
  },
  Rizal: {
    cities: {
      "Antipolo City": {
        barangays: ["Dalig", "De La Paz", "Mayamot", "San Jose", "San Roque", "Cupang"],
        postalCode: "1870",
      },
      Cainta: {
        barangays: ["San Andres", "San Isidro", "San Juan", "San Roque", "Santa Rosa"],
        postalCode: "1900",
      },
      Taytay: {
        barangays: ["Dolores", "San Isidro", "San Juan", "Santa Ana", "Muzon"],
        postalCode: "1920",
      },
    },
  },
  "Metro Manila": {
    cities: {
      "Makati City": {
        barangays: ["Bel-Air", "Poblacion", "San Lorenzo", "Bangkal", "Pio del Pilar", "Guadalupe", "Legazpi Village"],
        postalCode: "1200",
      },
      "Taguig City": {
        barangays: ["BGC / Fort Bonifacio", "Ususan", "Tuktukan", "Pinagsama", "Western Bicutan"],
        postalCode: "1630",
      },
      "Quezon City": {
        barangays: ["Diliman", "Cubao", "Batasan Hills", "Commonwealth", "Loyola Heights", "Fairview"],
        postalCode: "1100",
      },
      "Manila City": {
        barangays: ["Ermita", "Malate", "Sampaloc", "Binondo", "Santa Cruz", "Paco", "Intramuros"],
        postalCode: "1000",
      },
      "Pasig City": {
        barangays: ["Kapitolyo", "Ortigas Center", "San Nicolas", "Rosario", "Ugong", "Maybunga"],
        postalCode: "1600",
      },
      "Parañaque City": {
        barangays: ["BF Homes", "Don Bosco", "Moonwalk", "San Antonio", "Baclaran"],
        postalCode: "1700",
      },
      "Mandaluyong City": {
        barangays: ["Highway Hills", "Plainview", "Wack-Wack", "Barangka", "Hulo"],
        postalCode: "1550",
      },
      "Pasay City": {
        barangays: ["Malibay", "San Isidro", "San Jose", "San Rafael", "Maricaban"],
        postalCode: "1300",
      },
      "Muntinlupa City": {
        barangays: ["Alabang", "Ayala Alabang", "Putatan", "Poblacion", "Tunasan"],
        postalCode: "1770",
      },
    },
  },
  Pampanga: {
    cities: {
      "Angeles City": {
        barangays: ["Balibago", "Cutcut", "Pandan", "Sto. Domingo", "Malabanias", "Pulung Maragul"],
        postalCode: "2009",
      },
      "San Fernando City": {
        barangays: ["Dolores", "San Agustin", "Sindalan", "Telebastagan", "San Jose"],
        postalCode: "2000",
      },
      "Mabalacat City": {
        barangays: ["Dau", "Mabiga", "Camachiles", "Dolores", "Poblacion"],
        postalCode: "2010",
      },
    },
  },
  Bulacan: {
    cities: {
      "Malolos City": {
        barangays: ["Guinhawa", "Dakila", "Bulihan", "Catmon", "Mojon"],
        postalCode: "3000",
      },
      "San Jose del Monte": {
        barangays: ["Muzon", "Tungkong Mangga", "Graceville", "Kaypian"],
        postalCode: "3023",
      },
      "Meycauayan City": {
        barangays: ["Calvario", "Bangkal", "Perez", "Saluysoy", "Camalig"],
        postalCode: "3020",
      },
    },
  },
  Cebu: {
    cities: {
      "Cebu City": {
        barangays: ["Lahug", "Mabolo", "Banilad", "Guadalupe", "Capitol Site"],
        postalCode: "6000",
      },
      "Mandaue City": {
        barangays: ["Subangdaku", "Banilad", "Tipolo", "Bakilid", "Centro"],
        postalCode: "6014",
      },
      "Lapu-Lapu City": {
        barangays: ["Maribago", "Mactan", "Basak", "Pusok", "Pajo"],
        postalCode: "6015",
      },
    },
  },
  "Davao del Sur": {
    cities: {
      "Davao City": {
        barangays: ["Poblacion", "Buhangin", "Talomo", "Matina", "Toril", "Agdao"],
        postalCode: "8000",
      },
    },
  },
};

const TABS = [
  { id: "account", label: "Account Details" },
  { id: "vip", label: "VIP Club & Points" },
  { id: "addresses", label: "Delivery Addresses" },
  { id: "communication", label: "Communication Preferences" },
  { id: "visibility", label: "Profile Visibility" },
  { id: "privacy", label: "Privacy" },
];

function CustomerAccount({ initialTab }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromQuery = searchParams.get("tab");
  const navigate = useNavigate();
  const { user, loading: loadingProfile, setUser, refetchAppData } = useAppData();

  const [sidebarTab, setSidebarTab] = useState(
    initialTab || (["account", "vip", "addresses", "communication", "visibility", "privacy"].includes(tabFromQuery) ? tabFromQuery : "account")
  );

  const API_BASE_URL = import.meta.env.MODE === "production"
    ? "https://mhira-crmsystem.onrender.com"
    : "http://localhost:5000";

  const userId = getUserId();
  const fileInputRef = useRef(null);

  // Active Orders Red Dot State
  const [hasOrderNotification, setHasOrderNotification] = useState(() => {
    const cached = getCachedOrders();
    return hasActiveOrders(cached, userId);
  });

  useEffect(() => {
    if (userId) {
      syncCustomerOrders(userId).then((orders) => {
        setHasOrderNotification(hasActiveOrders(orders, userId));
      });
    }

    const handleOrdersSync = () => {
      const cached = getCachedOrders();
      setHasOrderNotification(hasActiveOrders(cached, userId));
    };

    window.addEventListener("ordersUpdated", handleOrdersSync);
    window.addEventListener("storage", handleOrdersSync);

    return () => {
      window.removeEventListener("ordersUpdated", handleOrdersSync);
      window.removeEventListener("storage", handleOrdersSync);
    };
  }, [userId]);

  // Profile Form State
  const [profile, setProfile] = useState({
    fullName: "Customer",
    username: "",
    email: "kentbundalian009@gmail.com",
    phoneNumber: "+63 9154673941",
    gender: "",
    profileImage: "",
    dateOfBirth: { month: "10", day: "25", year: "2005" },
    location: "Philippines",
    communicationPreferences: { generalCommunication: true },
    profileVisibility: {
      profileDisplay: "Kent698040697",
      reviewVisibility: "Public",
      locationSharing: "none",
    },
    privacySettings: {
      shareAdvertisingData: true,
      shareContactData: true,
      useRoutineData: true,
    },
    rewardPoints: 0,
    totalSpent: 0,
    tier: "Bronze",
  });

  // Form Input States for Account Details
  const [formFullName, setFormFullName] = useState("Customer");
  const [formUsername, setFormUsername] = useState("");
  const [formPhoneNumber, setFormPhoneNumber] = useState("+63 9154673941");
  const [formGender, setFormGender] = useState("");
  const [formLocation, setFormLocation] = useState("Philippines");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Track initial visibility state for "Unsaved Changes" banner
  const [initialVisibility, setInitialVisibility] = useState({
    profileDisplay: "Kent698040697",
    reviewVisibility: "Public",
    locationSharing: "none",
  });

  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [tempDisplayName, setTempDisplayName] = useState("Kent698040697");

  // Account Details DOB Inputs
  const [dobMonth, setDobMonth] = useState("10");
  const [dobDay, setDobDay] = useState("25");
  const [dobYear, setDobYear] = useState("2005");
  const [savingAccount, setSavingAccount] = useState(false);

  // Password Management States
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [isCurrentPassValid, setIsCurrentPassValid] = useState(null);
  const [isCheckingCurrentPass, setIsCheckingCurrentPass] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Delivery Addresses State
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [savingAddress, setSavingAddress] = useState(false);

  // Address Modal Form Fields
  const [addrRecipientName, setAddrRecipientName] = useState("Customer");
  const [addrStreet, setAddrStreet] = useState("");
  const [addrProvince, setAddrProvince] = useState("Laguna");
  const [addrCity, setAddrCity] = useState("Calamba City");
  const [addrBarangay, setAddrBarangay] = useState("Uwisan");
  const [addrPostcode, setAddrPostcode] = useState("4027");
  const [addrCountry, setAddrCountry] = useState("Philippines");
  const [addrPhone, setAddrPhone] = useState("+63 9154673941");
  const [addrInstructions, setAddrInstructions] = useState("");
  const [addrLabelType, setAddrLabelType] = useState("Home"); // "Home" | "Work" | "Other"
  const [addrCustomLabel, setAddrCustomLabel] = useState("");

  // Delete Address Confirmation Modal State
  const [isDeleteAddressModalOpen, setIsDeleteAddressModalOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null);
  const [deletingAddress, setDeletingAddress] = useState(false);

  // Delete Account State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Communication & Privacy State
  const [generalComm, setGeneralComm] = useState(true);
  const [savingComm, setSavingComm] = useState(false);
  const [privacyAdvertising, setPrivacyAdvertising] = useState(true);
  const [privacyContact, setPrivacyContact] = useState(true);
  const [privacyRoutine, setPrivacyRoutine] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [requestingData, setRequestingData] = useState(false);
  const [dataRequestSuccess, setDataRequestSuccess] = useState(false);

  // Photo upload
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Sync tab with URL query parameter
  useEffect(() => {
    if (tabFromQuery && ["account", "addresses", "communication", "visibility", "privacy"].includes(tabFromQuery)) {
      setSidebarTab(tabFromQuery);
    }
  }, [tabFromQuery]);

  const handleTabChange = (newTab) => {
    setSidebarTab(newTab);
    setSearchParams({ tab: newTab });
  };

  // Format incoming user data
  const formatProfileData = (u) => {
    if (!u) return;
    const dob = u.dateOfBirth || {};
    const comm = u.communicationPreferences || {};
    const vis = u.profileVisibility || {};
    const priv = u.privacySettings || {};

    const loadedProfile = {
      fullName: u.fullName || u.fullname || "Customer",
      username: u.username || "",
      email: u.email || "kentbundalian009@gmail.com",
      phoneNumber: u.phoneNumber || u.phone || "+63 9154673941",
      gender: u.gender || "",
      profileImage: u.profileImage || localStorage.getItem("profileImage") || "",
      dateOfBirth: {
        month: dob.month || "10",
        day: dob.day || "25",
        year: dob.year || "2005",
      },
      location: u.location || "Philippines",
      communicationPreferences: {
        generalCommunication: comm.generalCommunication !== false,
      },
      profileVisibility: {
        profileDisplay: vis.profileDisplay || u.username || u.fullName || "Kent698040697",
        reviewVisibility: vis.reviewVisibility || "Public",
        locationSharing: vis.locationSharing || "none",
      },
      privacySettings: {
        shareAdvertisingData: priv.shareAdvertisingData !== false,
        shareContactData: priv.shareContactData !== false,
        useRoutineData: priv.useRoutineData !== false,
      },
      rewardPoints: Number(u.rewardPoints || 0),
      totalSpent: Number(u.totalSpent || 0),
      tier: u.tier || (Number(u.totalSpent || 0) >= 10000 ? "Platinum" : Number(u.totalSpent || 0) >= 5000 ? "Gold" : Number(u.totalSpent || 0) >= 1000 ? "Silver" : "Bronze"),
    };

    setProfile(loadedProfile);
    setFormFullName(loadedProfile.fullName);
    setFormUsername(loadedProfile.username);
    setFormPhoneNumber(loadedProfile.phoneNumber);
    setFormGender(loadedProfile.gender);
    setFormLocation(loadedProfile.location);
    setDobMonth(loadedProfile.dateOfBirth.month);
    setDobDay(loadedProfile.dateOfBirth.day);
    setDobYear(loadedProfile.dateOfBirth.year);
    setGeneralComm(loadedProfile.communicationPreferences.generalCommunication);
    setPrivacyAdvertising(loadedProfile.privacySettings.shareAdvertisingData);
    setPrivacyContact(loadedProfile.privacySettings.shareContactData);
    setPrivacyRoutine(loadedProfile.privacySettings.useRoutineData);

    setInitialVisibility({ ...loadedProfile.profileVisibility });
    setTempDisplayName(loadedProfile.profileVisibility.profileDisplay);
  };

  // Fetch full user profile
  const fetchProfile = async () => {
    if (!userId) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/users/profile/${userId}`);
      if (res.data) {
        formatProfileData(res.data);
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
      if (user) formatProfileData(user);
    }
  };

  // Fetch customer addresses
  const fetchAddresses = async () => {
    if (!userId) return;
    setLoadingAddresses(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/users/${userId}/addresses`);
      if (res.data && Array.isArray(res.data.addresses)) {
        setAddresses(res.data.addresses);
      }
    } catch (err) {
      console.warn("Error fetching customer addresses:", err);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchAddresses();
  }, [userId]);

  useEffect(() => {
    if (user) {
      formatProfileData(user);
    }
  }, [user]);

  // Check if profile visibility has unsaved changes
  const hasVisibilityChanged = useMemo(() => {
    const curr = profile.profileVisibility || {};
    return (
      curr.profileDisplay !== initialVisibility.profileDisplay ||
      curr.reviewVisibility !== initialVisibility.reviewVisibility ||
      curr.locationSharing !== initialVisibility.locationSharing
    );
  }, [profile.profileVisibility, initialVisibility]);

  // Password verification debouncer
  useEffect(() => {
    if (!currentPassword || currentPassword.trim() === "") {
      setIsCurrentPassValid(null);
      setIsCheckingCurrentPass(false);
      return;
    }

    const timer = setTimeout(async () => {
      if (!userId) {
        setIsCurrentPassValid(true);
        return;
      }
      try {
        setIsCheckingCurrentPass(true);
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/api/users/verify-password/${userId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ currentPassword }),
        });
        if (response.ok) {
          const data = await response.json();
          setIsCurrentPassValid(data.valid === true);
        } else {
          setIsCurrentPassValid(false);
        }
      } catch (err) {
        console.error("Error verifying current password:", err);
      } finally {
        setIsCheckingCurrentPass(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [currentPassword, userId]);

  // Password submission
  const executePasswordChange = async () => {
    const token = localStorage.getItem("token");
    if (!userId) {
      showErrorToast("Failed to retrieve user session ID. Please log in again.");
      setIsConfirmModalOpen(false);
      return;
    }

    try {
      setSubmittingPassword(true);
      const response = await fetch(`${API_BASE_URL}/api/users/change-password/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to update password");

      showSuccessToast("Your account password has been successfully updated!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsCurrentPassValid(null);
      setIsConfirmModalOpen(false);
      setIsEditingPassword(false);
    } catch (error) {
      showErrorToast(error.message || "Failed to change password.");
    } finally {
      setSubmittingPassword(false);
    }
  };

  // Image Upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showErrorToast("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showErrorToast("Image size exceeds 5MB limit. Please choose a smaller photo.");
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const base64Image = await compressImageToBase64(file, {
        maxWidth: 300,
        maxHeight: 300,
        quality: 0.8,
      });

      setProfile((prev) => ({ ...prev, profileImage: base64Image }));
      localStorage.setItem("profileImage", base64Image);

      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          parsed.profileImage = base64Image;
          localStorage.setItem("user", JSON.stringify(parsed));
        } catch (err) {}
      }

      window.dispatchEvent(new Event("userUpdated"));
      window.dispatchEvent(new Event("profileUpdated"));

      try {
        await axios.put(`${API_BASE_URL}/api/users/profile/${userId}`, {
          profileImage: base64Image,
        });
      } catch (backendErr) {
        console.warn("Backend photo sync warning:", backendErr);
      }

      setIsUploadingPhoto(false);
      showSuccessToast("Profile picture updated successfully!");
    } catch (err) {
      setIsUploadingPhoto(false);
      showErrorToast("Failed to upload image.");
    }
  };

  const handleRemovePhoto = async () => {
    setProfile((prev) => ({ ...prev, profileImage: "" }));
    localStorage.removeItem("profileImage");
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        delete parsed.profileImage;
        localStorage.setItem("user", JSON.stringify(parsed));
      } catch (err) {}
    }
    window.dispatchEvent(new Event("userUpdated"));
    window.dispatchEvent(new Event("profileUpdated"));

    try {
      await axios.put(`${API_BASE_URL}/api/users/profile/${userId}`, {
        profileImage: "",
      });
    } catch (e) {}

    if (fileInputRef.current) fileInputRef.current.value = "";
    showSuccessToast("Profile picture removed.");
  };

  // Save Account Details
  const handleSaveAccountDetails = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!formFullName.trim()) {
      showErrorToast("Full Name is required.");
      return;
    }

    setSavingAccount(true);
    const updatedPayload = {
      fullName: formFullName.trim(),
      username: profile.username || formUsername || "",
      phoneNumber: formPhoneNumber.trim(),
      gender: formGender.trim(),
      dateOfBirth: {
        month: dobMonth,
        day: dobDay,
        year: dobYear,
      },
      location: formLocation.trim() || "Philippines",
    };

    try {
      await axios.put(`${API_BASE_URL}/api/users/profile/${userId}`, updatedPayload);
      
      setProfile((prev) => ({
        ...prev,
        ...updatedPayload,
      }));

      // Keep localStorage user object in sync
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          parsed.fullName = updatedPayload.fullName;
          parsed.fullname = updatedPayload.fullName;
          parsed.phoneNumber = updatedPayload.phoneNumber;
          parsed.gender = updatedPayload.gender;
          parsed.dateOfBirth = updatedPayload.dateOfBirth;
          parsed.location = updatedPayload.location;
          localStorage.setItem("user", JSON.stringify(parsed));
        } catch (err) {}
      }

      window.dispatchEvent(new Event("userUpdated"));
      window.dispatchEvent(new Event("profileUpdated"));
      showSuccessToast("Account details saved successfully!");
      setIsEditingProfile(false);
      if (refetchAppData) refetchAppData(true);
    } catch (error) {
      console.error("Error saving account details:", error);
      const errMsg = error.response?.data?.message || "Failed to save account details.";
      showErrorToast(errMsg);
    } finally {
      setSavingAccount(false);
    }
  };

  // Address Modal Helpers
  const openAddAddressModal = () => {
    setEditingAddressId(null);
    setAddrRecipientName(profile.fullName || "Customer");
    setAddrStreet("");
    setAddrProvince("Laguna");
    const defaultCity = "Calamba City";
    setAddrCity(defaultCity);
    setAddrBarangay("Uwisan");
    setAddrPostcode(PH_LOCATION_DATA["Laguna"]?.cities[defaultCity]?.postalCode || "4027");
    setAddrCountry("Philippines");
    setAddrPhone(profile.phoneNumber || "+63 9154673941");
    setAddrInstructions("");
    setAddrLabelType("Home");
    setAddrCustomLabel("");
    setIsAddressModalOpen(true);
  };

  const openEditAddressModal = (addr) => {
    setEditingAddressId(addr._id || addr.id);
    setAddrRecipientName(addr.fullName || profile.fullName || "Customer");
    setAddrStreet(addr.streetAddress || "");
    const prov = addr.province && PH_LOCATION_DATA[addr.province] ? addr.province : "Laguna";
    setAddrProvince(prov);
    const availableCities = PH_LOCATION_DATA[prov]?.cities || {};
    const city = addr.city && availableCities[addr.city] ? addr.city : Object.keys(availableCities)[0] || "";
    setAddrCity(city);
    const availableBgy = availableCities[city]?.barangays || [];
    const bgy = addr.barangay && availableBgy.includes(addr.barangay) ? addr.barangay : (availableBgy[0] || "");
    setAddrBarangay(bgy);
    setAddrPostcode(addr.postalCode || availableCities[city]?.postalCode || "");
    setAddrCountry(addr.country || "Philippines");
    setAddrPhone(addr.phoneNumber || profile.phoneNumber || "+63 9154673941");
    setAddrInstructions(addr.deliveryInstructions || "");

    const rawLabel = addr.label || "Home";
    if (rawLabel === "Home") {
      setAddrLabelType("Home");
      setAddrCustomLabel("");
    } else if (rawLabel === "Work") {
      setAddrLabelType("Work");
      setAddrCustomLabel("");
    } else {
      setAddrLabelType("Other");
      setAddrCustomLabel(rawLabel === "Other" ? "" : rawLabel);
    }
    setIsAddressModalOpen(true);
  };

  const handleProvinceChange = (newProvince) => {
    setAddrProvince(newProvince);
    const provData = PH_LOCATION_DATA[newProvince];
    if (provData && provData.cities) {
      const cityList = Object.keys(provData.cities);
      const firstCity = cityList[0] || "";
      setAddrCity(firstCity);
      if (firstCity && provData.cities[firstCity]) {
        const bgyList = provData.cities[firstCity].barangays || [];
        setAddrBarangay(bgyList[0] || "");
        setAddrPostcode(provData.cities[firstCity].postalCode || "");
      } else {
        setAddrBarangay("");
        setAddrPostcode("");
      }
    } else {
      setAddrCity("");
      setAddrBarangay("");
      setAddrPostcode("");
    }
  };

  const handleCityChange = (newCity) => {
    setAddrCity(newCity);
    const provData = PH_LOCATION_DATA[addrProvince];
    if (provData && provData.cities && provData.cities[newCity]) {
      const bgyList = provData.cities[newCity].barangays || [];
      setAddrBarangay(bgyList[0] || "");
      setAddrPostcode(provData.cities[newCity].postalCode || "");
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!addrStreet.trim()) {
      showErrorToast("Please enter your Apt, Suite, Building address.");
      return;
    }

    if (addrLabelType === "Other" && !addrCustomLabel.trim()) {
      showErrorToast("Please enter a custom label for 'Other' (e.g., Gym, Apartment).");
      return;
    }

    const finalLabel =
      addrLabelType === "Other"
        ? (addrCustomLabel.trim() || "Other")
        : addrLabelType;

    setSavingAddress(true);
    try {
      const payload = {
        fullName: addrRecipientName.trim() || profile.fullName || "Customer",
        phoneNumber: addrPhone.trim() || profile.phoneNumber || "+63 9154673941",
        province: addrProvince,
        city: addrCity,
        barangay: addrBarangay,
        postalCode: addrPostcode.trim(),
        country: "Philippines",
        streetAddress: addrStreet.trim(),
        deliveryInstructions: addrInstructions.trim(),
        label: finalLabel,
        isDefault: editingAddressId
          ? addresses.find((a) => (a._id || a.id) === editingAddressId)?.isDefault || false
          : addresses.length === 0,
      };

      let res;
      if (editingAddressId) {
        res = await axios.put(`${API_BASE_URL}/api/users/${userId}/addresses/${editingAddressId}`, payload);
        showSuccessToast("Delivery address updated successfully!");
      } else {
        res = await axios.post(`${API_BASE_URL}/api/users/${userId}/addresses`, payload);
        showSuccessToast("Delivery address saved successfully!");
      }

      if (res.data && Array.isArray(res.data.addresses)) {
        setAddresses(res.data.addresses);
      } else {
        await fetchAddresses();
      }

      setIsAddressModalOpen(false);
      setEditingAddressId(null);
      if (refetchAppData) refetchAppData(true);
    } catch (err) {
      console.error("Error saving address:", err);
      showErrorToast(err.response?.data?.message || "Failed to save delivery address.");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      const res = await axios.patch(`${API_BASE_URL}/api/users/${userId}/addresses/${addressId}/default`);
      if (res.data && Array.isArray(res.data.addresses)) {
        setAddresses(res.data.addresses);
      } else {
        await fetchAddresses();
      }
      showSuccessToast("Default delivery address updated.");
      if (refetchAppData) refetchAppData(true);
    } catch (err) {
      showErrorToast("Failed to update default address.");
    }
  };

  const promptDeleteAddress = (address) => {
    setAddressToDelete(address);
    setIsDeleteAddressModalOpen(true);
  };

  const handleConfirmDeleteAddress = async () => {
    if (!addressToDelete) return;
    const addrId = addressToDelete._id || addressToDelete.id;
    try {
      setDeletingAddress(true);
      const res = await axios.delete(`${API_BASE_URL}/api/users/${userId}/addresses/${addrId}`);
      if (res.data && Array.isArray(res.data.addresses)) {
        setAddresses(res.data.addresses);
      } else {
        await fetchAddresses();
      }
      showSuccessToast("Delivery address removed successfully.");
      setIsDeleteAddressModalOpen(false);
      setAddressToDelete(null);
      if (refetchAppData) refetchAppData(true);
    } catch (err) {
      console.error("Error deleting address:", err);
      showErrorToast("Failed to delete address.");
    } finally {
      setDeletingAddress(false);
    }
  };

  // Communication Preferences
  const handleSaveCommunication = async () => {
    setSavingComm(true);
    try {
      await axios.put(`${API_BASE_URL}/api/users/profile/${userId}`, {
        communicationPreferences: { generalCommunication: generalComm },
      });
      setProfile((prev) => ({
        ...prev,
        communicationPreferences: { generalCommunication: generalComm },
      }));
      showSuccessToast("Communication preferences saved!");
      if (refetchAppData) refetchAppData(true);
    } catch (err) {
      showErrorToast("Failed to save communication preferences.");
    } finally {
      setSavingComm(false);
    }
  };

  // Profile Visibility
  const handleSaveVisibility = async () => {
    try {
      const currentVis = profile.profileVisibility || {};
      const payload = {
        profileVisibility: {
          profileDisplay: currentVis.profileDisplay || "Kent698040697",
          reviewVisibility: currentVis.reviewVisibility || "Public",
          locationSharing: currentVis.locationSharing || "none",
        },
      };
      await axios.put(`${API_BASE_URL}/api/users/profile/${userId}`, payload);
      setInitialVisibility({ ...payload.profileVisibility });
      showSuccessToast("Profile visibility updated!");
      if (refetchAppData) refetchAppData(true);
    } catch (err) {
      showErrorToast("Failed to save visibility settings.");
    }
  };

  const handleDiscardVisibilityChanges = () => {
    setProfile((prev) => ({
      ...prev,
      profileVisibility: { ...initialVisibility },
    }));
    setTempDisplayName(initialVisibility.profileDisplay);
    setIsEditingDisplayName(false);
    showInfoToast("Changes discarded.");
  };

  // Privacy Settings
  const handleSavePrivacy = async () => {
    setSavingPrivacy(true);
    try {
      const payload = {
        privacySettings: {
          shareAdvertisingData: privacyAdvertising,
          shareContactData: privacyContact,
          useRoutineData: privacyRoutine,
        },
      };
      await axios.put(`${API_BASE_URL}/api/users/profile/${userId}`, payload);
      setProfile((prev) => ({ ...prev, ...payload }));
      showSuccessToast("Privacy preferences saved!");
      if (refetchAppData) refetchAppData(true);
    } catch (err) {
      showErrorToast("Failed to save privacy preferences.");
    } finally {
      setSavingPrivacy(false);
    }
  };

  // Request Data
  const handleRequestData = async () => {
    setRequestingData(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/users/request-data/${userId}`);
      setDataRequestSuccess(true);
      showSuccessToast(res.data.message || "Your data request has been received.");
    } catch (err) {
      showErrorToast("Failed to submit data request.");
    } finally {
      setRequestingData(false);
    }
  };

  // Delete Account
  const handleExecuteDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await axios.delete(`${API_BASE_URL}/api/users/${userId}`);
      showSuccessToast("Your account has been deleted.");
      localStorage.clear();
      window.dispatchEvent(new Event("userLogout"));
      window.location.href = "/";
    } catch (err) {
      console.error("Error deleting account:", err);
      showErrorToast("Failed to delete account. Please try again or contact support.");
    } finally {
      setIsDeletingAccount(false);
      setIsDeleteModalOpen(false);
    }
  };

  const currentProvinceData = PH_LOCATION_DATA[addrProvince] || { cities: {} };
  const currentCityData = currentProvinceData.cities[addrCity] || { barangays: [] };

  return (
    <div className="bg-white min-h-screen flex flex-col font-['Poppins',sans-serif] text-slate-800 antialiased">
      <HeaderContainer />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Hidden File Input for Profile Photo */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/png, image/jpeg, image/jpg, image/webp"
          className="hidden"
        />

        {/* BREADCRUMB & PAGE TITLE (MATCHES COLLECTION) */}
        <div className="mb-8">
          <nav className="text-xs text-slate-500 mb-3">
            <Link to="/" className="hover:underline hover:text-[#01390f] transition-colors">Home</Link>
            <span className="mx-2 text-slate-400">/</span>
            <span className="text-slate-900 capitalize">Settings</span>
          </nav>

          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h1 className="text-xl sm:text-2xl font-normal text-slate-900 tracking-tight capitalize">
              Settings
            </h1>
          </div>
        </div>

        {/* MAIN LAYOUT: UNBOXED SIDEBAR + CLEAN CONTENT */}
        <div className="flex flex-col md:flex-row items-start">

          {/* ================= LEFT SIDEBAR (CLEAN TEXT-ONLY CATEGORIES MATCHING COLLECTION) ================= */}
          <aside className="w-full md:w-56 flex-shrink-0 mb-6 md:mb-0 md:mr-8 lg:mr-12">
            <div className="w-full md:w-56">
              <nav className="flex md:flex-col overflow-x-auto scrollbar-none gap-5 sm:gap-6 md:gap-0 pb-2 md:pb-0 md:space-y-0.5">
                {TABS.map((tab) => {
                  if (tab.isExternal) {
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => navigate(tab.path)}
                        className="py-1 text-xs sm:text-sm leading-snug transition-colors text-left cursor-pointer shrink-0 md:w-full whitespace-nowrap text-[#26332E] hover:text-[#01390f] font-normal inline-flex items-center gap-1.5"
                      >
                        <span className="relative">
                          {tab.label}
                          {hasOrderNotification && (
                            <span className="absolute -top-0.5 -right-2 w-1.5 h-1.5 bg-[#c81e1e] rounded-full" />
                          )}
                        </span>
                      </button>
                    );
                  }
                  const isActive = sidebarTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleTabChange(tab.id)}
                      className={`py-1 text-xs sm:text-sm leading-snug transition-colors text-left cursor-pointer shrink-0 md:w-full whitespace-nowrap ${
                        isActive
                          ? "text-[#01390f] font-bold"
                          : "text-[#26332E] hover:text-[#01390f] font-normal"
                      }`}
                    >
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* ================= RIGHT MAIN CONTENT AREA (UNBOXED - NO CONTAINER CARDS) ================= */}
          <section className="flex-1 w-full max-w-2xl min-w-0">

            {/* TAB 1: ACCOUNT DETAILS */}
            {sidebarTab === "account" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="text-xl sm:text-2xl font-normal text-slate-900 tracking-tight">
                    Account Details
                  </h2>
                  <Link
                    to="/top-customers"
                    className="py-2 px-4 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[11px] sm:text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] inline-flex items-center gap-1.5"
                  >
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    <span>View Mhira Shoppers</span>
                  </Link>
                </div>

                {/* VIP MEMBERSHIP & REWARD POINTS CARD */}
                <div className="bg-gradient-to-br from-[#01390f] to-[#01260a] text-white rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden">
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                          Mhira Natural VIP Membership
                        </span>
                        <h3 className="text-lg font-black text-white mt-0.5">
                          {profile.fullName || "Valued Customer"}
                        </h3>
                        <p className="font-mono text-xs text-emerald-300">
                          @{profile.username || (profile.fullName ? profile.fullName.toLowerCase().replace(/[^a-z0-9]/g, "") : "customer")}
                        </p>
                      </div>

                      {/* VIP BADGE */}
                      <div>
                        {profile.tier === "Platinum" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-800 shadow-xs">
                            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                            <span>Platinum VIP</span>
                          </span>
                        ) : profile.tier === "Gold" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 shadow-xs">
                            <Award className="w-3.5 h-3.5 text-amber-600" />
                            <span>Gold VIP</span>
                          </span>
                        ) : profile.tier === "Silver" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-200 text-slate-900 shadow-xs">
                            <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
                            <span>Silver Loyal</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-orange-100 text-orange-900 shadow-xs">
                            <Star className="w-3.5 h-3.5 text-orange-600" />
                            <span>Bronze Member</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* POINTS & STATUS COUNTERS */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-emerald-800/80">
                      <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
                        <span className="text-[10px] uppercase font-bold text-emerald-200 block tracking-wider">Reward Points</span>
                        <span className="text-xl font-black text-amber-300 font-mono">
                          ⭐ {profile.rewardPoints || 0} pts
                        </span>
                        <span className="text-[10px] text-emerald-100 block mt-0.5">
                          ₱{profile.rewardPoints || 0}.00 discount at checkout
                        </span>
                      </div>

                      <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
                        <span className="text-[10px] uppercase font-bold text-emerald-200 block tracking-wider">VIP Status</span>
                        <span className="text-xl font-black text-white">
                          {profile.tier ? `${profile.tier} VIP` : "Bronze Member"}
                        </span>
                        <span className="text-[10px] text-emerald-100 block mt-0.5">
                          {profile.tier === "Platinum" ? "Highest VIP Tier Reached 🎉" : "Active Member Privileges"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Award className="w-48 h-48 absolute -right-6 -bottom-10 text-white/5 pointer-events-none" />
                </div>

                {/* Profile Photo Row */}
                <div className="flex items-center gap-4 py-2 border-b border-slate-100 pb-4">
                  <div
                    onClick={() => !isUploadingPhoto && fileInputRef.current?.click()}
                    className="w-16 h-16 rounded-full bg-[#01390f] text-white font-bold flex items-center justify-center text-xl overflow-hidden cursor-pointer relative hover:opacity-90 transition-opacity ring-2 ring-[#01390f]/20"
                    title="Click to upload profile photo"
                  >
                    {isUploadingPhoto ? (
                      <Loader2 className="w-5 h-5 animate-spin text-emerald-200" />
                    ) : profile.profileImage ? (
                      <img
                        src={profile.profileImage}
                        alt={profile.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{profile.fullName ? profile.fullName.slice(0, 2).toUpperCase() : "KB"}</span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <h3 className="font-semibold text-slate-900 text-sm">{profile.fullName || "Customer"}</h3>
                    <div className="flex items-center gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[#01390f] font-semibold hover:underline cursor-pointer"
                      >
                        {profile.profileImage ? "Change photo" : "Upload photo"}
                      </button>
                      {profile.profileImage && (
                        <>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="text-rose-600 font-semibold hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form Fields: Outline Floating Labels */}
                <div className="space-y-5">
                  {/* 1. Email Field (Top - Always Display-Only / Light Gray) */}
                  <div className="relative border border-slate-200 rounded-xl px-4 py-3.5 bg-slate-100/80">
                    <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-medium text-slate-400">
                      Email*
                    </label>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-700 font-normal">
                        {profile.email || "kentbundalian009@gmail.com"}
                      </span>
                      <Mail className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                    </div>
                  </div>

                  {/* 2. Username Field (Always Display-Only / Light Gray) */}
                  <div className="relative border border-slate-200 rounded-xl px-4 py-3.5 bg-slate-100/80">
                    <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-medium text-slate-400">
                      Username*
                    </label>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-700 font-normal">
                        {profile.username || formUsername ? `@${profile.username || formUsername}` : "@customer"}
                      </span>
                      <span className="text-xs font-medium text-slate-400 ml-2">@</span>
                    </div>
                  </div>

                  {/* 3. Full Name Field */}
                  {!isEditingProfile ? (
                    <div className="relative border border-slate-200 rounded-xl px-4 py-3.5 bg-slate-100/80">
                      <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-medium text-slate-400">
                        Full Name*
                      </label>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 font-normal">
                          {formFullName || profile.fullName || "Customer"}
                        </span>
                        <User className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                      </div>
                    </div>
                  ) : (
                    <div className="relative border border-slate-300 rounded-xl px-4 py-3.5 focus-within:border-slate-800 transition-colors bg-white">
                      <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-medium text-slate-500">
                        Full Name*
                      </label>
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={formFullName}
                          onChange={(e) => setFormFullName(e.target.value)}
                          placeholder="Enter your full name"
                          className="w-full bg-transparent outline-none text-sm text-slate-900 font-normal"
                        />
                        <User className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                      </div>
                    </div>
                  )}

                  {/* 4. Phone Number Field */}
                  {!isEditingProfile ? (
                    <div className="relative border border-slate-200 rounded-xl px-4 py-3.5 bg-slate-100/80">
                      <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-medium text-slate-400">
                        Phone Number
                      </label>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 font-normal">
                          {formPhoneNumber || profile.phoneNumber || "Not provided"}
                        </span>
                        <Phone className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                      </div>
                    </div>
                  ) : (
                    <div className="relative border border-slate-300 rounded-xl px-4 py-3.5 focus-within:border-slate-800 transition-colors bg-white">
                      <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-medium text-slate-500">
                        Phone Number
                      </label>
                      <div className="flex items-center justify-between">
                        <input
                          type="tel"
                          value={formPhoneNumber}
                          onChange={(e) => setFormPhoneNumber(e.target.value)}
                          placeholder="+63 9154673941"
                          className="w-full bg-transparent outline-none text-sm text-slate-900 font-normal"
                        />
                        <Phone className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                      </div>
                    </div>
                  )}

                  {/* 5. Gender Field */}
                  {!isEditingProfile ? (
                    <div className="relative border border-slate-200 rounded-xl px-4 py-3.5 bg-slate-100/80">
                      <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-medium text-slate-400">
                        Gender
                      </label>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 font-normal">
                          {formGender || profile.gender || "Not specified"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative border border-slate-300 rounded-xl px-4 py-3.5 focus-within:border-slate-800 transition-colors bg-white">
                      <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-medium text-slate-500">
                        Gender
                      </label>
                      <div className="flex items-center justify-between">
                        <select
                          value={formGender}
                          onChange={(e) => setFormGender(e.target.value)}
                          className="w-full bg-transparent outline-none text-sm text-slate-900 font-normal cursor-pointer appearance-none"
                        >
                          <option value="">Select Gender</option>
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
                          <option value="Non-binary">Non-binary</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  {/* 6. Date of Birth Inputs: MM / DD / YYYY */}
                  {!isEditingProfile ? (
                    <div className="relative border border-slate-200 rounded-xl px-4 py-3.5 bg-slate-100/80">
                      <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-medium text-slate-400">
                        Date of Birth
                      </label>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 font-normal">
                          {dobMonth && dobDay && dobYear ? `${dobMonth} / ${dobDay} / ${dobYear}` : "Not specified"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-sm font-medium text-slate-900">
                        Date of Birth
                      </label>
                      <div className="flex items-center gap-2 max-w-sm">
                        <div className="relative border border-slate-300 rounded-xl px-4 py-3 focus-within:border-slate-800 transition-colors bg-white flex-1 text-center">
                          <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[11px] font-medium text-slate-500">
                            MM
                          </label>
                          <input
                            type="text"
                            maxLength={2}
                            value={dobMonth}
                            onChange={(e) => setDobMonth(e.target.value.replace(/\D/g, ""))}
                            placeholder="10"
                            className="w-full bg-transparent outline-none text-sm text-slate-900 font-medium text-center"
                          />
                        </div>
                        <span className="text-slate-400 font-light text-lg">/</span>
                        <div className="relative border border-slate-300 rounded-xl px-4 py-3 focus-within:border-slate-800 transition-colors bg-white flex-1 text-center">
                          <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[11px] font-medium text-slate-500">
                            DD
                          </label>
                          <input
                            type="text"
                            maxLength={2}
                            value={dobDay}
                            onChange={(e) => setDobDay(e.target.value.replace(/\D/g, ""))}
                            placeholder="25"
                            className="w-full bg-transparent outline-none text-sm text-slate-900 font-medium text-center"
                          />
                        </div>
                        <span className="text-slate-400 font-light text-lg">/</span>
                        <div className="relative border border-slate-300 rounded-xl px-4 py-3 focus-within:border-slate-800 transition-colors bg-white flex-1 text-center">
                          <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[11px] font-medium text-slate-500">
                            YYYY
                          </label>
                          <input
                            type="text"
                            maxLength={4}
                            value={dobYear}
                            onChange={(e) => setDobYear(e.target.value.replace(/\D/g, ""))}
                            placeholder="2005"
                            className="w-full bg-transparent outline-none text-sm text-slate-900 font-medium text-center"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 7. Location Field */}
                  {!isEditingProfile ? (
                    <div className="relative border border-slate-200 rounded-xl px-4 py-3.5 bg-slate-100/80">
                      <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-medium text-slate-400">
                        Country/Region
                      </label>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 font-normal">
                          {formLocation || profile.location || "Philippines"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-sm font-medium text-slate-900">
                        Location
                      </label>
                      <div className="relative border border-slate-300 rounded-xl px-4 py-3.5 focus-within:border-slate-800 transition-colors bg-white">
                        <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-normal text-slate-500">
                          Country/Region*
                        </label>
                        <div className="flex items-center justify-between">
                          <select
                            value={formLocation}
                            onChange={(e) => setFormLocation(e.target.value)}
                            className="w-full bg-transparent outline-none text-sm text-slate-900 font-normal cursor-pointer appearance-none"
                          >
                            <option value="Philippines">Philippines</option>
                            <option value="United States">United States</option>
                            <option value="Canada">Canada</option>
                            <option value="Singapore">Singapore</option>
                            <option value="Japan">Japan</option>
                            <option value="Australia">Australia</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions: Edit Button initially; Save & Cancel when editing */}
                  <div className="pt-2 flex items-center gap-3">
                    {!isEditingProfile ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(true)}
                        className="px-8 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer text-center"
                      >
                        Edit Profile
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleSaveAccountDetails}
                          disabled={savingAccount}
                          className="px-8 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer text-center disabled:opacity-50"
                        >
                          {savingAccount ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormFullName(profile.fullName || "");
                            setFormPhoneNumber(profile.phoneNumber || "");
                            setFormGender(profile.gender || "");
                            setDobMonth(profile.dateOfBirth?.month || "10");
                            setDobDay(profile.dateOfBirth?.day || "25");
                            setDobYear(profile.dateOfBirth?.year || "2005");
                            setFormLocation(profile.location || "Philippines");
                            setIsEditingProfile(false);
                          }}
                          className="px-6 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7]"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Divider between Profile and Security */}
                <div className="border-t border-slate-200 my-8" />

                {/* ================= SECURITY SECTION ================= */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#01390f]" />
                    <h3 className="text-lg font-semibold text-slate-900">
                      Security
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600">
                    Manage your password and security credentials to keep your account safe.
                  </p>

                  {/* Password Card (DO NOT SHOW ANY PASSWORD OR HIDDEN DOTS TO PREVENT HACKER/INFO LEAK) */}
                  <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-slate-600" />
                          <span className="text-sm font-semibold text-slate-900 block">
                            Password
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Set a strong password to protect your account. Never share your password with anyone.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingPassword(!isEditingPassword);
                          if (isEditingPassword) {
                            setCurrentPassword("");
                            setNewPassword("");
                            setConfirmPassword("");
                          }
                        }}
                        className="bg-slate-900 hover:bg-black text-white px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs whitespace-nowrap self-start sm:self-auto"
                      >
                        {isEditingPassword ? "Cancel" : "Change Password"}
                      </button>
                    </div>

                    {/* Expandable Password Editor */}
                    {isEditingPassword && (
                      <div className="pt-4 border-t border-slate-100 space-y-4 animate-fadeIn">
                        {/* Current Password */}
                        <div className="relative border border-slate-300 rounded-xl px-4 py-3 focus-within:border-slate-800 transition-colors bg-white">
                          <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-normal text-slate-500">
                            Current Password*
                          </label>
                          <div className="flex items-center justify-between">
                            <input
                              type={showCurrentPass ? "text" : "password"}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="Enter current password"
                              className="w-full bg-transparent outline-none text-sm text-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPass(!showCurrentPass)}
                              className="text-slate-400 hover:text-slate-600 cursor-pointer ml-2"
                            >
                              {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* New Password */}
                        <div className="relative border border-slate-300 rounded-xl px-4 py-3 focus-within:border-slate-800 transition-colors bg-white">
                          <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-normal text-slate-500">
                            New Password*
                          </label>
                          <div className="flex items-center justify-between">
                            <input
                              type={showNewPass ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Min. 6 characters"
                              className="w-full bg-transparent outline-none text-sm text-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPass(!showNewPass)}
                              className="text-slate-400 hover:text-slate-600 cursor-pointer ml-2"
                            >
                              {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="relative border border-slate-300 rounded-xl px-4 py-3 focus-within:border-slate-800 transition-colors bg-white">
                          <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-normal text-slate-500">
                            Confirm Password*
                          </label>
                          <div className="flex items-center justify-between">
                            <input
                              type={showConfirmPass ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Re-enter new password"
                              className="w-full bg-transparent outline-none text-sm text-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPass(!showConfirmPass)}
                              className="text-slate-400 hover:text-slate-600 cursor-pointer ml-2"
                            >
                              {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {confirmPassword && newPassword && confirmPassword !== newPassword && (
                          <p className="text-xs text-rose-500 font-medium">Passwords do not match</p>
                        )}

                        <div className="flex items-center gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsConfirmModalOpen(true)}
                            disabled={!currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 6 || submittingPassword}
                            className="bg-[#01390f] hover:bg-[#024a14] text-white px-6 py-2.5 rounded-full text-xs font-semibold tracking-normal transition-all cursor-pointer disabled:opacity-40"
                          >
                            Save New Password
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingPassword(false);
                              setCurrentPassword("");
                              setNewPassword("");
                              setConfirmPassword("");
                            }}
                            className="text-xs font-medium text-slate-600 hover:text-slate-900 underline cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Divider between Security and Delete Account */}
                <div className="border-t border-slate-200 my-8" />

                {/* ================= DANGER ZONE: DELETE ACCOUNT (PINAKA BABA) ================= */}
                <div className="space-y-4">
                  <div className="border border-rose-200 bg-rose-50/40 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span className="text-sm font-semibold text-rose-900 block">
                          Delete Account
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-md">
                        Permanently delete your account, order records, and personal settings. This action cannot be reversed.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="border border-rose-300 hover:bg-rose-600 hover:text-white bg-white text-rose-700 px-6 py-2 rounded-full text-xs font-medium transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: VIP CLUB & POINTS */}
            {sidebarTab === "vip" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-normal text-slate-900 tracking-tight">
                      Mhira VIP Club & Rewards Points
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Your accumulated points, loyalty privileges, and discount status.
                    </p>
                  </div>
                  <Link
                    to="/top-customers"
                    className="py-2.5 px-5 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <Award className="w-3.5 h-3.5 text-amber-300" />
                    <span>View Mhira Shoppers</span>
                  </Link>
                </div>

                {/* VIP CARD */}
                <div className="bg-gradient-to-br from-[#01390f] via-[#024a14] to-[#01250a] text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                          Current Tier Status
                        </span>
                        <h3 className="text-2xl font-black text-white mt-1">
                          {profile.fullName || "Customer"}
                        </h3>
                        <p className="font-mono text-xs text-emerald-200">
                          @{profile.username || (profile.fullName ? profile.fullName.toLowerCase().replace(/[^a-z0-9]/g, "") : "customer")}
                        </p>
                      </div>

                      {profile.tier === "Platinum" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-900 shadow-xs">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                          <span>Platinum VIP</span>
                        </span>
                      ) : profile.tier === "Gold" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 shadow-xs">
                          <Award className="w-3.5 h-3.5 text-amber-600" />
                          <span>Gold VIP</span>
                        </span>
                      ) : profile.tier === "Silver" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-200 text-slate-900 shadow-xs">
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
                          <span>Silver Loyal</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-orange-100 text-orange-900 shadow-xs">
                          <Star className="w-3.5 h-3.5 text-orange-600" />
                          <span>Bronze Member</span>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-emerald-800/80">
                      <div className="bg-white/10 rounded-xl p-3.5">
                        <span className="text-[10px] font-bold text-emerald-200 uppercase block tracking-wider">Available Points</span>
                        <span className="text-2xl font-black text-amber-300 font-mono">
                          ⭐ {profile.rewardPoints || 0} pts
                        </span>
                        <span className="text-[11px] text-emerald-100 block mt-0.5">
                          = ₱{profile.rewardPoints || 0}.00 OFF automatically usable at checkout
                        </span>
                      </div>

                      <div className="bg-white/10 rounded-xl p-3.5">
                        <span className="text-[10px] font-bold text-emerald-200 uppercase block tracking-wider">VIP Privileges</span>
                        <span className="text-2xl font-black text-white font-mono">
                          {profile.tier ? `${profile.tier} VIP` : "Bronze Member"}
                        </span>
                        <span className="text-[11px] text-emerald-100 block mt-0.5">
                          Earns 1 reward point per ₱50.00 spent
                        </span>
                      </div>
                    </div>
                  </div>
                  <Award className="w-56 h-56 absolute -right-8 -bottom-12 text-white/5 pointer-events-none" />
                </div>

                {/* HOW TO REDEEM */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Gift className="w-4 h-4 text-[#01390f]" />
                    <span>How to Use Your Points for Discounts:</span>
                  </h3>
                  <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#EDF7EE] text-[#01390f] font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                      <p>Add your favorite botanical skincare items to your cart.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#EDF7EE] text-[#01390f] font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                      <p>Proceed to Checkout. In the Order Summary, check the box: <strong>"Redeem Mhira Reward Points"</strong>.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#EDF7EE] text-[#01390f] font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                      <p>Your points will be instantly deducted from your total bill (1 pt = ₱1.00 OFF)!</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DELIVERY ADDRESSES */}
            {sidebarTab === "addresses" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-normal text-slate-900 tracking-tight">
                      Saved Delivery Addresses
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Manage your delivery addresses and courier instructions for checkout.
                    </p>
                  </div>
                  {addresses.length > 0 && (
                    <button
                      type="button"
                      onClick={openAddAddressModal}
                      className="inline-flex items-center gap-1.5 bg-[#01390f] hover:bg-[#024a14] text-white px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Address</span>
                    </button>
                  )}
                </div>

                {/* Empty State */}
                {addresses.length === 0 ? (
                  <div className="space-y-6 pt-2">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3.5 text-sm text-slate-700">
                      <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                      <p className="font-normal text-slate-700 leading-relaxed">
                        You currently don't have any saved delivery addresses. Add an address here to be pre-filled for quicker checkout.
                      </p>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={openAddAddressModal}
                        className="inline-flex items-center gap-2 bg-[#01390f] hover:bg-[#024a14] text-white px-7 py-3 rounded-full text-xs font-semibold tracking-normal transition-all cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Address</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Saved Addresses List */
                  <div className="space-y-4 pt-2">
                    {addresses.map((addr, idx) => {
                      const isHome = (addr.label || "Home").toLowerCase() === "home";
                      const isWork = (addr.label || "").toLowerCase() === "work";
                      return (
                        <div
                          key={addr._id || addr.id || idx}
                          className="p-5 border border-slate-200 rounded-2xl bg-white space-y-3 shadow-2xs hover:border-slate-300 transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="space-y-1.5 flex-1">
                              {/* Label & Default Badges */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                                    isHome
                                      ? "bg-[#01390f]/10 text-[#01390f]"
                                      : isWork
                                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                                      : "bg-purple-50 text-purple-700 border border-purple-200"
                                  }`}
                                >
                                  {isHome ? (
                                    <Home className="w-3.5 h-3.5" />
                                  ) : isWork ? (
                                    <Briefcase className="w-3.5 h-3.5" />
                                  ) : (
                                    <Tag className="w-3.5 h-3.5" />
                                  )}
                                  <span>{addr.label || "Home"}</span>
                                </span>

                                {addr.isDefault && (
                                  <span className="bg-[#01390f] text-white font-semibold text-[10px] px-2.5 py-0.5 rounded-full shadow-2xs">
                                    Default
                                  </span>
                                )}
                              </div>

                              {/* Street Address */}
                              <div className="pt-1">
                                <h3 className="font-semibold text-sm text-slate-900">
                                  {addr.streetAddress}
                                </h3>
                                <p className="text-xs text-slate-600 mt-0.5">
                                  {addr.barangay ? `${addr.barangay}, ` : ""}
                                  {addr.city}, {addr.province} {addr.postalCode}
                                </p>
                                <p className="text-xs text-slate-500">{addr.country || "Philippines"}</p>
                              </div>

                              {/* Optional Remarks / Delivery Instructions */}
                              {addr.deliveryInstructions && (
                                <div className="mt-2 text-xs bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-slate-700 flex items-start gap-2">
                                  <span className="font-semibold text-[#01390f] shrink-0">Instruction:</span>
                                  <span className="text-slate-600 italic">"{addr.deliveryInstructions}"</span>
                                </div>
                              )}
                            </div>

                            {/* Actions: Set Default, Edit, Delete */}
                            <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-xs pt-2 sm:pt-0 self-end sm:self-start">
                              {!addr.isDefault && (
                                <button
                                  type="button"
                                  onClick={() => handleSetDefaultAddress(addr._id || addr.id)}
                                  className="text-slate-600 hover:text-[#01390f] font-medium underline cursor-pointer transition-colors"
                                >
                                  Set as Default
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openEditAddressModal(addr)}
                                className="inline-flex items-center gap-1 text-[#01390f] hover:text-[#024a14] font-medium hover:underline cursor-pointer transition-colors px-2 py-1 rounded-lg hover:bg-slate-50"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => promptDeleteAddress(addr)}
                                className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-medium hover:underline cursor-pointer transition-colors px-2 py-1 rounded-lg hover:bg-rose-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: COMMUNICATION PREFERENCES */}
            {sidebarTab === "communication" && (
              <div className="space-y-6 animate-fadeIn">
                <h2 className="text-xl sm:text-2xl font-normal text-slate-900 tracking-tight">
                  Communication Preferences
                </h2>

                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-slate-900">
                      General Communication
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Get updates on products, offers and your Member benefits.
                    </p>
                  </div>

                  {/* Toggle Checkbox */}
                  <label className="flex items-center gap-3 cursor-pointer select-none pt-2">
                    <input
                      type="checkbox"
                      checked={generalComm}
                      onChange={(e) => setGeneralComm(e.target.checked)}
                      className="w-5 h-5 accent-[#01390f] rounded cursor-pointer"
                    />
                    <span className="text-sm text-slate-800">
                      Yes, email me member offers, seasonal product drops, and exclusive wellness benefits.
                    </span>
                  </label>

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleSaveCommunication}
                      disabled={savingComm}
                      className="bg-[#01390f] hover:bg-[#024a14] text-white px-8 py-2.5 rounded-full text-xs font-semibold tracking-normal transition-all cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      {savingComm ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PROFILE VISIBILITY */}
            {sidebarTab === "visibility" && (
              <div className="space-y-6 animate-fadeIn">
                {/* Unsaved Changes Banner */}
                {hasVisibilityChanged && (
                  <div className="bg-slate-900 text-white px-5 py-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg animate-fadeIn">
                    <div className="text-xs sm:text-sm font-medium">
                      <strong className="block sm:inline font-semibold">Save Changes: </strong>
                      Looks like you updated your Settings. Save your changes, or select "Don't Save" to discard them.
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleDiscardVisibilityChanges}
                        className="px-4 py-1.5 rounded-full text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Don't Save
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveVisibility}
                        className="bg-white text-slate-900 hover:bg-slate-100 px-5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-normal text-slate-900 tracking-tight">
                    Profile Visibility
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Your Mhira Natural profile represents you on product reviews and across the Mhira Natural wellness community.
                  </p>
                </div>

                {/* Avatar & Display Name */}
                <div className="space-y-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-4 py-2">
                    <div
                      onClick={() => !isUploadingPhoto && fileInputRef.current?.click()}
                      className="w-14 h-14 rounded-full bg-[#01390f] text-white font-bold flex items-center justify-center text-lg overflow-hidden cursor-pointer relative hover:opacity-90 transition-opacity"
                    >
                      {isUploadingPhoto ? (
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                      ) : profile.profileImage ? (
                        <img
                          src={profile.profileImage}
                          alt={profile.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{profile.fullName ? profile.fullName.slice(0, 2).toUpperCase() : "KB"}</span>
                      )}
                    </div>

                    <div className="space-y-1 flex-1">
                      <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Profile Display
                      </span>
                      {isEditingDisplayName ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={tempDisplayName}
                            onChange={(e) => setTempDisplayName(e.target.value)}
                            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-[#01390f]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setProfile((prev) => ({
                                ...prev,
                                profileVisibility: {
                                  ...prev.profileVisibility,
                                  profileDisplay: tempDisplayName,
                                },
                              }));
                              setIsEditingDisplayName(false);
                            }}
                            className="text-xs bg-[#01390f] text-white px-3 py-1.5 rounded-lg font-semibold"
                          >
                            Done
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTempDisplayName(profile.profileVisibility?.profileDisplay || "Kent698040697");
                              setIsEditingDisplayName(false);
                            }}
                            className="text-xs text-slate-500 hover:text-slate-800"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-slate-900">
                            {profile.profileVisibility?.profileDisplay || "Kent698040697"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsEditingDisplayName(true)}
                            className="text-xs font-semibold text-slate-800 underline hover:text-[#01390f] cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Product Review Visibility */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Product Review Visibility
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Choose how you will appear on any Mhira Natural product reviews you complete. Changing these settings also affects your visibility in community wellness programs.{" "}
                      <Link to="/about" className="text-[#01390f] underline">Learn More</Link>
                    </p>
                  </div>

                  <div className="space-y-2 pt-1">
                    {[
                      { id: "Private", label: "Private: Profile visible to only you" },
                      { id: "Social", label: "Social: Profile visible to verified customers & wellness community" },
                      { id: "Public", label: "Public: Everyone can view profile" },
                    ].map((opt) => (
                      <label
                        key={opt.id}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="reviewVisibility"
                          value={opt.id}
                          checked={profile.profileVisibility?.reviewVisibility === opt.id}
                          onChange={(e) =>
                            setProfile((prev) => ({
                              ...prev,
                              profileVisibility: {
                                ...prev.profileVisibility,
                                reviewVisibility: e.target.value,
                              },
                            }))
                          }
                          className="w-4 h-4 accent-[#01390f] cursor-pointer"
                        />
                        <span className="text-xs sm:text-sm text-slate-800">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Location Sharing */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Location Sharing
                  </h3>
                  <div className="space-y-2">
                    {[
                      { id: "friends", label: "Share my location with verified buyers only" },
                      { id: "none", label: "Don't share my location" },
                    ].map((opt) => (
                      <label
                        key={opt.id}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="locationSharing"
                          value={opt.id}
                          checked={profile.profileVisibility?.locationSharing === opt.id}
                          onChange={(e) =>
                            setProfile((prev) => ({
                              ...prev,
                              profileVisibility: {
                                ...prev.profileVisibility,
                                locationSharing: e.target.value,
                              },
                            }))
                          }
                          className="w-4 h-4 accent-[#01390f] cursor-pointer"
                        />
                        <span className="text-xs sm:text-sm text-slate-800">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleSaveVisibility}
                    className="bg-[#01390f] hover:bg-[#024a14] text-white px-8 py-2.5 rounded-full text-xs font-semibold tracking-normal transition-all cursor-pointer shadow-sm"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: PRIVACY */}
            {sidebarTab === "privacy" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-normal text-slate-900 tracking-tight">
                    Privacy
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    We use your data to serve you relevant organic skincare recommendations and measure how well they perform. This includes data about how you explore our natural products, collected by Mhira Natural and our trusted logistics partners, along with other data we collect, such as your email or phone number. You can control how your data is used for advertising by adjusting your privacy settings below. For more information, see our{" "}
                    <Link to="/privacy" className="text-[#01390f] underline font-medium">
                      Mhira Natural Privacy Policy
                    </Link>.
                  </p>
                </div>

                {/* Privacy Options */}
                <div className="space-y-5 pt-3 border-t border-slate-100">
                  {/* Option 1 */}
                  <div className="space-y-1">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacyAdvertising}
                        onChange={(e) => setPrivacyAdvertising(e.target.checked)}
                        className="w-5 h-5 accent-[#01390f] rounded cursor-pointer mt-0.5 shrink-0"
                      />
                      <div className="text-xs sm:text-sm text-slate-800 space-y-1">
                        <p>
                          Allows sharing of data about how you use our site and apps with advertising partners. This data is used to serve you with ads and enhance and report on the personalised advertising experience on partner sites.
                        </p>
                        <a href="/privacy" className="text-[#01390f] text-xs underline font-medium block">
                          Learn more about personalised advertising
                        </a>
                      </div>
                    </label>
                  </div>

                  {/* Option 2 */}
                  <div className="space-y-1">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacyContact}
                        onChange={(e) => setPrivacyContact(e.target.checked)}
                        className="w-5 h-5 accent-[#01390f] rounded cursor-pointer mt-0.5 shrink-0"
                      />
                      <div className="text-xs sm:text-sm text-slate-800 space-y-1">
                        <p>
                          Allows sharing of your email address and phone number with advertising partners to personalise advertising based on your interests and measure the effectiveness of advertising on partner sites.
                        </p>
                        <a href="/privacy" className="text-[#01390f] text-xs underline font-medium block">
                          Learn more about profile-based advertising
                        </a>
                      </div>
                    </label>
                  </div>

                  {/* Option 3 */}
                  <div className="space-y-1">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacyRoutine}
                        onChange={(e) => setPrivacyRoutine(e.target.checked)}
                        className="w-5 h-5 accent-[#01390f] rounded cursor-pointer mt-0.5 shrink-0"
                      />
                      <div className="text-xs sm:text-sm text-slate-800">
                        Use my skincare routine and purchase history to provide adaptive regimens, personalized product recommendations, and special event invitations.
                      </div>
                    </label>
                  </div>

                  {/* Save Privacy Settings Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSavePrivacy}
                      disabled={savingPrivacy}
                      className="bg-[#01390f] hover:bg-[#024a14] text-white px-8 py-2.5 rounded-full text-xs font-semibold tracking-normal transition-all cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      {savingPrivacy ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>

                {/* Download Your Data Section */}
                <div className="space-y-3 pt-6 border-t border-slate-200">
                  <h3 className="text-base font-semibold text-slate-900">
                    Download Your Data
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    If you request your account data, Mhira Natural will email you a link to download details about your account, such as order history, skincare routine entries, loyalty activity and your profile information.
                  </p>

                  <div className="pt-2">
                    {dataRequestSuccess ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Data request submitted. A secure link will be sent to your registered email.</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestData}
                        disabled={requestingData}
                        className="border border-slate-300 hover:border-slate-800 px-6 py-2.5 rounded-full text-xs font-semibold text-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {requestingData ? "Submitting Request..." : "Request Data"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

          </section>

        </div>
      </main>

      {/* ================= ADD / EDIT ADDRESS MODAL ================= */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 relative my-auto animate-fadeIn max-h-[92vh] overflow-y-auto">
            {/* Top Right Close Button */}
            <button
              type="button"
              onClick={() => {
                setIsAddressModalOpen(false);
                setEditingAddressId(null);
              }}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer absolute top-6 right-6 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Title */}
            <div className="pr-8 mb-5">
              <h3 className="text-xl font-normal text-slate-900 tracking-tight">
                {editingAddressId ? "Edit Address" : "Add Address"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {editingAddressId
                  ? "Update your delivery location details and instructions below."
                  : "Enter your delivery address and instructions below."}
              </p>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-4">
              {/* SECTION 1: ADDRESS INFORMATION */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <MapPin className="w-4 h-4 text-[#01390f]" />
                  <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                    Address Information
                  </span>
                </div>

                {/* Recipient Full Name */}
                <div className="relative border border-slate-300 rounded-xl px-4 py-3 focus-within:border-slate-800 transition-colors bg-white">
                  <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-normal text-slate-500">
                    Recipient Full Name*
                  </label>
                  <input
                    type="text"
                    required
                    value={addrRecipientName}
                    onChange={(e) => setAddrRecipientName(e.target.value)}
                    placeholder="Recipient's Name"
                    className="w-full bg-transparent outline-none text-sm text-slate-900 font-normal"
                  />
                </div>

                {/* Phone Number */}
                <div className="relative border border-slate-300 rounded-xl px-4 py-3 focus-within:border-slate-800 transition-colors bg-white">
                  <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-normal text-slate-500">
                    Phone Number*
                  </label>
                  <input
                    type="text"
                    required
                    value={addrPhone}
                    onChange={(e) => setAddrPhone(e.target.value)}
                    placeholder="+63 9154673941"
                    className="w-full bg-transparent outline-none text-sm text-slate-900 font-normal"
                  />
                </div>

                {/* Apt, Suite, Building, Street */}
                <div className="relative border border-slate-300 rounded-xl px-4 py-3 focus-within:border-slate-800 transition-colors bg-white">
                  <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-normal text-slate-500">
                    Apt, Suite, Building, Street*
                  </label>
                  <input
                    type="text"
                    required
                    value={addrStreet}
                    onChange={(e) => setAddrStreet(e.target.value)}
                    placeholder="House/Unit No., Street name, Subdivision/Building"
                    className="w-full bg-transparent outline-none text-sm text-slate-900 font-normal"
                  />
                </div>

                {/* Province* and City/Municipality* (2 Columns) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Province Dropdown */}
                  <div className="relative border border-slate-300 rounded-xl px-4 py-3 focus-within:border-slate-800 transition-colors bg-white">
                    <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-normal text-slate-500">
                      Province*
                    </label>
                    <select
                      value={addrProvince}
                      onChange={(e) => handleProvinceChange(e.target.value)}
                      className="w-full bg-transparent outline-none text-sm text-slate-900 font-normal appearance-none pr-8 cursor-pointer"
                    >
                      {Object.keys(PH_LOCATION_DATA).map((prov) => (
                        <option key={prov} value={prov}>
                          {prov}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* City/Municipality Dropdown */}
                  <div className="relative border border-slate-300 rounded-xl px-4 py-3 focus-within:border-slate-800 transition-colors bg-white">
                    <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-normal text-slate-500">
                      City/Municipality*
                    </label>
                    <select
                      value={addrCity}
                      onChange={(e) => handleCityChange(e.target.value)}
                      className="w-full bg-transparent outline-none text-sm text-slate-900 font-normal appearance-none pr-8 cursor-pointer"
                    >
                      {Object.keys(currentProvinceData.cities || {}).map((cityName) => (
                        <option key={cityName} value={cityName}>
                          {cityName}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Barangay* and Postcode (2 Columns) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Barangay Dropdown */}
                  <div className="relative border border-slate-300 rounded-xl px-4 py-3 focus-within:border-slate-800 transition-colors bg-white">
                    <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-normal text-slate-500">
                      Barangay*
                    </label>
                    <select
                      value={addrBarangay}
                      onChange={(e) => setAddrBarangay(e.target.value)}
                      className="w-full bg-transparent outline-none text-sm text-slate-900 font-normal appearance-none pr-8 cursor-pointer"
                    >
                      {(currentCityData.barangays || []).map((bgy) => (
                        <option key={bgy} value={bgy}>
                          {bgy}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Postcode Input */}
                  <div className="relative border border-slate-300 rounded-xl px-4 py-3 focus-within:border-slate-800 transition-colors bg-white">
                    <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-normal text-slate-500">
                      Postcode
                    </label>
                    <input
                      type="text"
                      value={addrPostcode}
                      onChange={(e) => setAddrPostcode(e.target.value)}
                      placeholder="4027"
                      className="w-full bg-transparent outline-none text-sm text-slate-900 font-normal"
                    />
                  </div>
                </div>

                {/* Country/Region* (Auto-selected Philippines) */}
                <div className="relative border border-slate-300 rounded-xl px-4 py-3 focus-within:border-slate-800 transition-colors bg-white">
                  <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-normal text-slate-500">
                    Country/Region*
                  </label>
                  <div className="flex items-center justify-between text-sm text-slate-900 font-normal">
                    <span>Philippines</span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* SECTION 2: ADD INSTRUCTION (OPTIONAL REMARKS) */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                    Add Instruction
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    Optional
                  </span>
                </div>
                <div className="relative border border-slate-300 rounded-xl px-4 py-3 focus-within:border-slate-800 transition-colors bg-white">
                  <input
                    type="text"
                    value={addrInstructions}
                    onChange={(e) => setAddrInstructions(e.target.value)}
                    placeholder="e.g., Near yellow gate, leave with guard, ring doorbell"
                    className="w-full bg-transparent outline-none text-sm text-slate-900 font-normal"
                  />
                </div>
                <p className="text-[11px] text-slate-500 pl-1">
                  Remarks or special delivery notes for the courier.
                </p>
              </div>

              {/* SECTION 3: LABEL (3 CIRCULAR ICON OPTIONS: HOME, WORK, + OTHER) */}
              <div className="pt-2 space-y-3">
                <div className="pb-1 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider block">
                    Label
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Select an address label:
                  </p>
                </div>

                <div className="flex items-center gap-6 pt-1">
                  {/* Home Circle Button */}
                  <button
                    type="button"
                    onClick={() => setAddrLabelType("Home")}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer"
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        addrLabelType === "Home"
                          ? "bg-[#01390f] text-white shadow-md ring-3 ring-[#01390f]/20 scale-105"
                          : "bg-slate-100 text-slate-600 border border-slate-200 group-hover:bg-slate-200 group-hover:text-slate-900"
                      }`}
                    >
                      <Home className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-xs ${
                        addrLabelType === "Home"
                          ? "text-[#01390f] font-semibold"
                          : "text-slate-600 font-medium"
                      }`}
                    >
                      Home
                    </span>
                  </button>

                  {/* Work Circle Button */}
                  <button
                    type="button"
                    onClick={() => setAddrLabelType("Work")}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer"
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        addrLabelType === "Work"
                          ? "bg-[#01390f] text-white shadow-md ring-3 ring-[#01390f]/20 scale-105"
                          : "bg-slate-100 text-slate-600 border border-slate-200 group-hover:bg-slate-200 group-hover:text-slate-900"
                      }`}
                    >
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-xs ${
                        addrLabelType === "Work"
                          ? "text-[#01390f] font-semibold"
                          : "text-slate-600 font-medium"
                      }`}
                    >
                      Work
                    </span>
                  </button>

                  {/* Other (+) Circle Button */}
                  <button
                    type="button"
                    onClick={() => setAddrLabelType("Other")}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer"
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        addrLabelType === "Other"
                          ? "bg-[#01390f] text-white shadow-md ring-3 ring-[#01390f]/20 scale-105"
                          : "bg-slate-100 text-slate-600 border border-slate-200 group-hover:bg-slate-200 group-hover:text-slate-900"
                      }`}
                    >
                      <Plus className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-xs ${
                        addrLabelType === "Other"
                          ? "text-[#01390f] font-semibold"
                          : "text-slate-600 font-medium"
                      }`}
                    >
                      Other
                    </span>
                  </button>
                </div>

                {/* When "Other" is selected, user types custom label */}
                {addrLabelType === "Other" && (
                  <div className="pt-2 animate-fadeIn">
                    <div className="relative border border-slate-300 rounded-xl px-4 py-3 focus-within:border-slate-800 transition-colors bg-white">
                      <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-normal text-slate-500">
                        Custom Label*
                      </label>
                      <input
                        type="text"
                        required={addrLabelType === "Other"}
                        value={addrCustomLabel}
                        onChange={(e) => setAddrCustomLabel(e.target.value)}
                        placeholder="e.g., Gym, Apartment, Parents' House"
                        maxLength={30}
                        className="w-full bg-transparent outline-none text-sm text-slate-900 font-normal"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 pl-1">
                      Type your customized address label name.
                    </p>
                  </div>
                )}
              </div>

              {/* SAVE / SUBMIT BUTTONS */}
              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddressModalOpen(false);
                    setEditingAddressId(null);
                  }}
                  className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
                >
                  {savingAddress
                    ? editingAddressId
                      ? "Updating Address..."
                      : "Saving Address..."
                    : editingAddressId
                    ? "Save Changes"
                    : "Save Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DELETE ADDRESS CONFIRMATION MODAL ================= */}
      {isDeleteAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 animate-fadeIn space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Delete Delivery Address
                </h3>
                <p className="text-xs text-slate-500">
                  Confirm address removal
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Are you sure you want to delete this delivery address? This action cannot be undone.
            </p>

            {addressToDelete && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 space-y-1">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#01390f]" />
                  <span>{addressToDelete.label || "Address"}</span>
                  {addressToDelete.isDefault && (
                    <span className="text-[10px] bg-[#01390f]/10 text-[#01390f] px-2 py-0.5 rounded-full font-medium">Default</span>
                  )}
                </div>
                <p className="text-slate-700 font-medium">{addressToDelete.streetAddress}</p>
                <p className="text-slate-500">
                  {addressToDelete.barangay ? `${addressToDelete.barangay}, ` : ""}
                  {addressToDelete.city}, {addressToDelete.province} {addressToDelete.postalCode || ""}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteAddressModalOpen(false);
                  setAddressToDelete(null);
                }}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAddress}
                disabled={deletingAddress}
                className="px-6 py-2.5 sm:py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
              >
                {deletingAddress ? "Deleting..." : "Yes, Delete Address"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PASSWORD CONFIRMATION MODAL ================= */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 animate-fadeIn space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900">
                Confirm Password Update
              </h3>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Are you sure you want to update your account password? You will need your new password the next time you sign in to Mhira Natural.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executePasswordChange}
                disabled={submittingPassword}
                className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
              >
                {submittingPassword ? "Updating..." : "Confirm & Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE ACCOUNT CONFIRMATION MODAL ================= */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 animate-fadeIn space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-semibold text-slate-900">
                Delete Account
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete your account? This action cannot be undone and will delete your order history, review entries, and saved natural skincare preferences.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteAccount}
                disabled={isDeletingAccount}
                className="px-6 py-2.5 sm:py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
              >
                {isDeletingAccount ? "Deleting..." : "Yes, Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default CustomerAccount;
