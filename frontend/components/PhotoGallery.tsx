"use client";

import { useState } from "react";
import PhotoUpload from "@/components/PhotoUpload";

export default function PhotoGallery() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <section
      id="photos"
      className="py-24 px-6 bg-[#FAF7F2]"
    >
      <div className="max-w-4xl mx-auto text-center">
        {/* Heading */}
        <p className="font-sans text-xs uppercase tracking-[0.3em] text-[#C4A35A] mb-3">
          Фотографии
        </p>
        <h2
          className="font-serif italic"
          style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", color: "#2C2418" }}
        >
          Поделитесь фотографиями
        </h2>
        <div className="ornament w-40 mx-auto mt-4 text-[#C4A35A] text-sm" aria-hidden="true">
          ✦
        </div>
        <p className="font-sans text-sm text-[#7A6E60] mt-4 mb-10">
          Помогите нам сохранить эти воспоминания! Пожалуйста, загрузите ваши лучшие фотографии с торжества сюда. 📷<br />
          <span className="block mt-2">Просим вас не загружать слишком много — до 10 фотографий от каждого гостя будет вполне достаточно.</span>
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-2 bg-[#C4A35A] text-white font-sans text-sm px-8 py-3.5 rounded-xl hover:bg-[#B8934A] transition shadow-sm w-full sm:w-auto justify-center"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Загрузить фото
          </button>

          {process.env.NEXT_PUBLIC_PHOTOS_FOLDER_URL && (
            <a
              href={process.env.NEXT_PUBLIC_PHOTOS_FOLDER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-[#2C2418] border border-[#E0D8CC] font-sans text-sm px-8 py-3.5 rounded-xl hover:bg-[#F2EBE0] transition shadow-sm w-full sm:w-auto justify-center"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Скачать все фото
            </a>
          )}
        </div>
      </div>

      {/* Upload modal */}
      <PhotoUpload
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={() => {
          // We no longer show the gallery locally, so we can just ignore updates,
          // or we could show a "thank you" toast. For now, do nothing.
        }}
      />
    </section>
  );
}
