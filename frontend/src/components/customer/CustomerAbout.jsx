import React, { useState, useEffect } from "react";
import { User } from "lucide-react";
import HeaderContainer from "../common/HeaderContainer";
import Footer from "../common/Footer";
import { API, getImageUrl } from "../../axios";
import { subscribeLiveSync } from "../../utils/liveSync";

const DEFAULT_STORY = {
  headline: "“WE WORK AS ONE TO BE THE NUMBER ONE”",
  intro:
    "At Mhira Natural, we believe that taking care of yourself should feel simple, gentle, and natural.",
  founderName: "Mirasol P. Bituin",
  founderRole: "Founder",
  founderImage: "",
  founderBio1:
    "The Mhira Natural Soap and Cosmetics Manufacturing was founded by Mirasol P. Bituin in 2018, a passionate entrepreneur with a deep love for nature and a vision to create natural skincare products that are gentle on the skin and the environment.",
  founderBio2:
    "Mhira’s journey began when she struggled to find skincare products that were free from harsh chemicals and synthetic ingredients. Determined to make a difference, she embarked on a mission to develop a line of products that would harness the power of nature to promote healthy and radiant skin.",
  visionTitle: "Vision",
  visionText:
    "To become the most influential Natural Hair and Skin Care Company in both local and international aspects. We aspire to inspire people around the world to embrace their individuality and celebrate their unique beauty.",
  taglineTitle: "Tagline",
  taglineText:
    "\"We work as one to be the number one!\" expresses the concept of unity and collective effort towards achieving the top position or becoming the best in a particular endeavor. It highlights the importance of teamwork, collaboration, and synergy in reaching the ultimate goal.",
  pillars: [
    {
      title: "Natural care, made for everyday",
      description:
        "We create personal care products that make everyday self-care easy and enjoyable. From skin to hair, our products are made to fit naturally into your daily routine—simple to use, gentle to your skin, and made for your everyday needs.",
    },
    {
      title: "Nature-inspired, skin-loving care",
      description:
        "We believe in the power of nature. Each Mhira Natural product is thoughtfully made with carefully selected ingredients inspired by nature, bringing gentle care to your skin and hair while helping you feel fresh, confident, and naturally beautiful.",
    },
    {
      title: "Kind to you, kind to nature",
      description:
        "Beauty should not come at the expense of the world around us. Mhira Natural is committed to creating products with care for you, your skin, your hair, and the environment we all share.",
    },
    {
      title: "Made with care, made for you",
      description:
        "Our promise is simple: to create natural personal care that feels good, works beautifully, and brings a little more care into your everyday routine.",
    },
  ],
  bannerImage: "",
  closingTagline: "Mhira Natural — Simple care. Natural beauty. Everyday you.",
};

function CustomerAbout() {
  const [story, setStory] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_marketing_story");
      if (cached) return { ...DEFAULT_STORY, ...JSON.parse(cached) };
    } catch (e) {}
    return { ...DEFAULT_STORY };
  });

  const [imgError, setImgError] = useState(false);

  const fetchStory = async () => {
    try {
      const res = await API.get("/api/story");
      if (res.data?.success && res.data?.story) {
        const fetched = { ...DEFAULT_STORY, ...res.data.story };
        setStory(fetched);
        try {
          localStorage.setItem("cached_marketing_story", JSON.stringify(fetched));
        } catch (e) {}
      }
    } catch (err) {
      console.warn("Could not fetch latest story from API, using cached/default:", err.message);
    }
  };

  useEffect(() => {
    fetchStory();

    // Subscribe to real-time updates from marketing CMS
    const unsubscribe = subscribeLiveSync((data) => {
      if (data?.type === "story" || data?.type === "marketing") {
        fetchStory();
      }
    });

    return () => unsubscribe();
  }, []);

  const founderImgUrl = story.founderImage ? getImageUrl(story.founderImage) : "";
  const bannerImgUrl = story.bannerImage ? getImageUrl(story.bannerImage) : "";

  return (
    <div className="bg-white min-h-screen flex flex-col font-['Poppins',sans-serif] text-gray-800 antialiased">
      <HeaderContainer />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-16 w-full">
        {/* OPTIONAL HERO / BRAND BANNER IF MARKETING UPLOADED ONE */}
        {bannerImgUrl && (
          <div className="mb-10 w-full h-52 sm:h-72 rounded-2xl overflow-hidden border border-gray-100 shadow-sm relative">
            <img
              src={bannerImgUrl}
              alt="Mhira Natural Brand Banner"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent flex items-end p-6">
              <span className="text-white text-xs sm:text-sm font-semibold tracking-wide drop-shadow-md">
                Mhira Natural Soap and Cosmetics Manufacturing
              </span>
            </div>
          </div>
        )}

        {/* MAIN EDITORIAL HEADLINE */}
        <h1 className="text-2xl sm:text-3xl font-bold italic tracking-tight text-[#243746] mb-8 leading-tight">
          {story.headline || DEFAULT_STORY.headline}
        </h1>

        {/* CONTENT SECTIONS */}
        <div className="text-xs sm:text-sm text-gray-600 space-y-8 leading-relaxed font-normal">
          <p className="text-gray-600">
            {story.intro || DEFAULT_STORY.intro}
          </p>

          {/* FOUNDER SECTION */}
          <section className="space-y-4">
            <h2 className="text-sm sm:text-base font-bold text-[#243746] tracking-wide">
              Founder
            </h2>

            <div className="flex flex-col sm:flex-row items-start gap-6 pt-1">
              {/* FOUNDER PICTURE */}
              <div className="shrink-0">
                <div className="w-44 h-56 sm:w-48 sm:h-60 rounded-xl overflow-hidden bg-slate-100 border border-[#E1E9EF] flex flex-col items-center justify-center text-slate-400 p-2 text-center relative shadow-xs">
                  {founderImgUrl && !imgError ? (
                    <img
                      src={founderImgUrl}
                      alt={story.founderName || "Founder"}
                      className="w-full h-full object-cover rounded-lg"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4">
                      <User size={44} className="text-slate-300 mb-2" />
                      <span className="text-xs font-semibold text-slate-500">
                        {story.founderName || "Mirasol P. Bituin"}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {story.founderRole || "Founder"}
                      </span>
                    </div>
                  )}
                </div>
                {founderImgUrl && !imgError && (
                  <div className="mt-2 text-center">
                    <span className="text-xs font-semibold text-[#243746] block">
                      {story.founderName || "Mirasol P. Bituin"}
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium">
                      {story.founderRole || "Founder"}
                    </span>
                  </div>
                )}
              </div>

              {/* FOUNDER TEXT */}
              <div className="space-y-3 flex-1">
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {story.founderBio1 || DEFAULT_STORY.founderBio1}
                </p>
                {(story.founderBio2 || DEFAULT_STORY.founderBio2) && (
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                    {story.founderBio2 || DEFAULT_STORY.founderBio2}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* VISION SECTION */}
          <section className="space-y-2">
            <h2 className="text-sm sm:text-base font-bold text-[#243746] tracking-wide">
              {story.visionTitle || "Vision"}
            </h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">
              {story.visionText || DEFAULT_STORY.visionText}
            </p>
          </section>

          {/* TAGLINE SECTION */}
          <section className="space-y-2">
            <h2 className="text-sm sm:text-base font-bold text-[#243746] tracking-wide">
              {story.taglineTitle || "Tagline"}
            </h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">
              {story.taglineText || DEFAULT_STORY.taglineText}
            </p>
          </section>

          {/* BRAND PILLARS */}
          {Array.isArray(story.pillars) &&
            story.pillars.map((pillar, idx) => (
              <section key={idx} className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-[#243746] tracking-wide">
                  {pillar.title}
                </h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {pillar.description}
                </p>
              </section>
            ))}

          {/* CLOSING TAGLINE */}
          <div className="pt-2">
            <p className="text-xs sm:text-sm md:text-base italic font-semibold text-[#246C94]">
              {story.closingTagline || DEFAULT_STORY.closingTagline}
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default CustomerAbout;