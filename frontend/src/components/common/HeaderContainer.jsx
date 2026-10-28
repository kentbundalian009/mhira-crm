import React from "react";
import Topbar from "./Topbar";
import Header from "./Header";
import AddedToBagToast from "./AddedToBagToast";
import AddedToFavoritesToast from "./AddedToFavoritesToast";
import Chatbot from "../customer/Chatbot";
import GuestFaqChatbot from "../customer/GuestFaqChatbot";
import { useAppData } from "../../context/AppDataContext";

function HeaderContainer() {
  const appData = useAppData();
  const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
  let storedUser = null;
  try {
    storedUser = JSON.parse(localStorage.getItem("user") || "null");
  } catch (e) {
    storedUser = null;
  }
  const activeUser = appData?.user || storedUser;
  const isLoggedIn = Boolean(token && activeUser);

  return (
    <>
      <div className="sticky top-0 z-50 w-full shadow-xs bg-[#EDF7EE] customer-header-nav font-['Poppins',sans-serif]">
        {/* Topbar & Announcement */}
        <Topbar />
        
        {/* Unified Header (Left Navigation, Centered Logo, Right Icons & Search) */}
        <Header />

        {/* Added to Bag Toast Notification */}
        <AddedToBagToast />

        {/* Added to Favorites Toast Notification */}
        <AddedToFavoritesToast />
      </div>

      {/* Global AI & Live Support Chatbot (when logged in) or Interactive FAQ Concierge (when guest) */}
      {isLoggedIn ? <Chatbot /> : <GuestFaqChatbot />}
    </>
  );
}

export default HeaderContainer;