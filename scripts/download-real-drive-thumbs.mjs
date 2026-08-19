import fs from 'node:fs';

const itemsToDownload = [
  {
    id: '1ST9YlBMn-iHyYTGdVBICXQH49kHoR89y',
    filename: 'assets/portfolio/1ST9YlBMn-iHyYTGdVBICXQH49kHoR89y.webp',
    url: 'https://lh3.googleusercontent.com/drive-storage/AJQWtBMbKH7vaz5U404pnBquZk0gSDHE_cRh1MFVBqGIVERtYBci1PhPh7qdmmQhD5dxP2jL9BaYa1FhGvQJI9MKlyo2s7qsSl24qz2XcoE0=s800',
    title: 'Wedding Highlight Film (wedding(6).mov)',
    category: 'wedding-highlights'
  },
  {
    id: '1HvMxfpX5YIa2YRW4NFr2i069FcldvfUL',
    filename: 'assets/portfolio/1HvMxfpX5YIa2YRW4NFr2i069FcldvfUL.webp',
    url: 'https://lh3.googleusercontent.com/drive-storage/AJQWtBP9INVFHVxdZrux2gEgEREmGf0qzBWpz5j6_-l4100fkSC63DRKpFso4oI_LUopGOJ8SPdjgAP-yJYM-zODHdNK4rB8WsG7CRhFJIc=s800',
    title: 'Video Edit — IMG 1072',
    category: 'editing-alone'
  },
  {
    id: '1ASkxeGMdRTH9KmI8uDXWrH_13GwYykZh',
    filename: 'assets/portfolio/1ASkxeGMdRTH9KmI8uDXWrH_13GwYykZh.webp',
    url: 'https://lh3.googleusercontent.com/drive-storage/AJQWtBNmOZ4TEC8uXbI962ZtU-hWazJYY1SfonmdUklJnoaipmZBfrN8p_IEtemYzXGkBH9vEjOlvNGPMlTjJQS7wJzC-kQv-o4oJJJ1JD4=s800',
    title: 'Video Edit — IMG 3968',
    category: 'editing-alone'
  },
  {
    id: '1J04gH2wPUZnG67mEZgfaJBVUCxIcWOsR',
    filename: 'assets/portfolio/1J04gH2wPUZnG67mEZgfaJBVUCxIcWOsR.webp',
    url: 'https://lh3.googleusercontent.com/drive-storage/AJQWtBN_MHPmkJi5M0IE34EXUWloHA6pExaJQTI_5mN4KvOE3955u_uNtBHV9oL2zaQaNAgwG9Q1SXYDre_QL4ocX-NZLzzMFj6Y05NTT7g=s800',
    title: 'Video Edit — IMG 4065',
    category: 'editing-alone'
  },
  {
    id: '10tIPdMuMU_6JxN2_X2m4n00KK3SMp91q',
    filename: 'assets/portfolio/10tIPdMuMU_6JxN2_X2m4n00KK3SMp91q.webp',
    url: 'https://lh3.googleusercontent.com/drive-storage/AJQWtBMejKIsHDnyC1Aze59TYWrKEC4TOxnqDUjS-_z7IQoi8Cpri4Jmir2T7Z8UveXmpIGU-oj_YcOAB76AQbfx4-NP9RgikxHdEMaT_58=s800',
    title: 'Video Edit — Kida 2',
    category: 'editing-alone'
  },
  {
    id: '1ZTb4jeJnK9YTu3t_ZXXAi2f3i9t-u9ly',
    filename: 'assets/portfolio/1ZTb4jeJnK9YTu3t_ZXXAi2f3i9t-u9ly.webp',
    url: 'https://lh3.googleusercontent.com/drive-storage/AJQWtBP3FGn3rh2NiOqxXISPrnCW_PFvr-zNWkFN1h02CiEEcjJdJGktwVRwddjaZv1DK7GLT3KPxvZNvIf-emFAgtKmO_i-aHhF65fY-nQ=s800',
    title: 'Video Edit — Kida Metroprime New',
    category: 'editing-alone'
  }
];

async function run() {
  for (const item of itemsToDownload) {
    try {
      const res = await fetch(item.url);
      const buf = await res.arrayBuffer();
      fs.writeFileSync(item.filename, Buffer.from(buf));
      console.log(`Downloaded ${item.filename} (${buf.byteLength} bytes)`);
    } catch (e) {
      console.error(`Error downloading ${item.filename}:`, e.message);
    }
  }

  // Now update content.js with exact video items matching the real files
  const contentCode = fs.readFileSync('content.js', 'utf8');
  const fakeWindow = {};
  new Function('window', contentCode)(fakeWindow);
  const content = fakeWindow.OLYMPUS_CONTENT;

  // Replace wedding-highlights items with authentic video items
  const weddingItems = [
    {
      id: '1ST9YlBMn-iHyYTGdVBICXQH49kHoR89y',
      title: 'Wedding Highlight Film (wedding(6).mov)',
      description: 'Cinematic wedding highlight film, emotional narrative capture, and professional grade.',
      category: 'wedding-highlights',
      collection: 'Wedding Highlights',
      year: '2025',
      mediaType: 'video',
      thumbnailSrc: 'assets/portfolio/1ST9YlBMn-iHyYTGdVBICXQH49kHoR89y.webp',
      previewSrc: 'assets/portfolio/1ST9YlBMn-iHyYTGdVBICXQH49kHoR89y.webp',
      originalUrl: 'https://drive.google.com/file/d/1ST9YlBMn-iHyYTGdVBICXQH49kHoR89y/view',
      alt: 'Wedding Highlight Film wedding(6).mov by Olympus Atelier',
      featured: true
    },
    {
      id: '1V3iS3FUXxQBentD7IZ7gfZhLEvienxAU',
      title: 'Wedding Highlights Collection (Full Folder)',
      description: 'Complete archive of wedding highlight films, ceremony moments, and reception reels.',
      category: 'wedding-highlights',
      collection: 'Wedding Highlights',
      year: '2025',
      mediaType: 'video',
      thumbnailSrc: 'assets/portfolio/1ST9YlBMn-iHyYTGdVBICXQH49kHoR89y.webp',
      previewSrc: 'assets/portfolio/1ST9YlBMn-iHyYTGdVBICXQH49kHoR89y.webp',
      originalUrl: 'https://drive.google.com/drive/folders/1V3iS3FUXxQBentD7IZ7gfZhLEvienxAU',
      alt: 'Wedding Highlights Collection by Olympus Atelier',
      featured: true
    }
  ];

  // Replace editing-alone items with authentic video editing items
  const editingItems = [
    {
      id: '1HvMxfpX5YIa2YRW4NFr2i069FcldvfUL',
      title: 'Post-Production Cut — IMG 1072',
      description: 'Cinematic pacing, color grading, and audio design for commercial production.',
      category: 'editing-alone',
      collection: 'Video Editing Alone',
      year: '2025',
      mediaType: 'video',
      thumbnailSrc: 'assets/portfolio/1HvMxfpX5YIa2YRW4NFr2i069FcldvfUL.webp',
      previewSrc: 'assets/portfolio/1HvMxfpX5YIa2YRW4NFr2i069FcldvfUL.webp',
      originalUrl: 'https://drive.google.com/file/d/1HvMxfpX5YIa2YRW4NFr2i069FcldvfUL/view',
      alt: 'Video Editing IMG 1072 by Olympus Atelier',
      featured: true
    },
    {
      id: '1ASkxeGMdRTH9KmI8uDXWrH_13GwYykZh',
      title: 'Commercial Cut — IMG 3968',
      description: 'High-impact visual cut, rhythm matching, and brand color grading.',
      category: 'editing-alone',
      collection: 'Video Editing Alone',
      year: '2025',
      mediaType: 'video',
      thumbnailSrc: 'assets/portfolio/1ASkxeGMdRTH9KmI8uDXWrH_13GwYykZh.webp',
      previewSrc: 'assets/portfolio/1ASkxeGMdRTH9KmI8uDXWrH_13GwYykZh.webp',
      originalUrl: 'https://drive.google.com/file/d/1ASkxeGMdRTH9KmI8uDXWrH_13GwYykZh/view',
      alt: 'Video Editing IMG 3968 by Olympus Atelier',
      featured: true
    },
    {
      id: '1J04gH2wPUZnG67mEZgfaJBVUCxIcWOsR',
      title: 'Editorial Story Edit — IMG 4065',
      description: 'Documentary style narrative assembly, audio balancing, and finishing.',
      category: 'editing-alone',
      collection: 'Video Editing Alone',
      year: '2025',
      mediaType: 'video',
      thumbnailSrc: 'assets/portfolio/1J04gH2wPUZnG67mEZgfaJBVUCxIcWOsR.webp',
      previewSrc: 'assets/portfolio/1J04gH2wPUZnG67mEZgfaJBVUCxIcWOsR.webp',
      originalUrl: 'https://drive.google.com/file/d/1J04gH2wPUZnG67mEZgfaJBVUCxIcWOsR/view',
      alt: 'Video Editing IMG 4065 by Olympus Atelier',
      featured: true
    },
    {
      id: '10tIPdMuMU_6JxN2_X2m4n00KK3SMp91q',
      title: 'Campaign Edit — Kida 2',
      description: 'Dynamic pacing, transitions, and audio sync for campaign launch.',
      category: 'editing-alone',
      collection: 'Video Editing Alone',
      year: '2025',
      mediaType: 'video',
      thumbnailSrc: 'assets/portfolio/10tIPdMuMU_6JxN2_X2m4n00KK3SMp91q.webp',
      previewSrc: 'assets/portfolio/10tIPdMuMU_6JxN2_X2m4n00KK3SMp91q.webp',
      originalUrl: 'https://drive.google.com/file/d/10tIPdMuMU_6JxN2_X2m4n00KK3SMp91q/view',
      alt: 'Video Editing Kida 2 by Olympus Atelier',
      featured: true
    },
    {
      id: '1ZTb4jeJnK9YTu3t_ZXXAi2f3i9t-u9ly',
      title: 'Brand Film Edit — Kida Metroprime New',
      description: 'High-end brand film post-production, sound engineering, and colour delivery.',
      category: 'editing-alone',
      collection: 'Video Editing Alone',
      year: '2025',
      mediaType: 'video',
      thumbnailSrc: 'assets/portfolio/1ZTb4jeJnK9YTu3t_ZXXAi2f3i9t-u9ly.webp',
      previewSrc: 'assets/portfolio/1ZTb4jeJnK9YTu3t_ZXXAi2f3i9t-u9ly.webp',
      originalUrl: 'https://drive.google.com/file/d/1ZTb4jeJnK9YTu3t_ZXXAi2f3i9t-u9ly/view',
      alt: 'Video Editing Kida Metroprime New by Olympus Atelier',
      featured: true
    },
    {
      id: '1j_D4ePzhUsHBXyORwNFJoTbMrjSFgvCU',
      title: 'Video Editing Alone (Full Production Folder)',
      description: 'Complete post-production folder with raw cuts, finished grades, and platform exports.',
      category: 'editing-alone',
      collection: 'Video Editing Alone',
      year: '2025',
      mediaType: 'video',
      thumbnailSrc: 'assets/portfolio/1ZTb4jeJnK9YTu3t_ZXXAi2f3i9t-u9ly.webp',
      previewSrc: 'assets/portfolio/1ZTb4jeJnK9YTu3t_ZXXAi2f3i9t-u9ly.webp',
      originalUrl: 'https://drive.google.com/drive/folders/1j_D4ePzhUsHBXyORwNFJoTbMrjSFgvCU',
      alt: 'Video Editing Alone Collection by Olympus Atelier',
      featured: true
    }
  ];

  // Filter out the old dummy wedding and editing items
  const otherItems = content.portfolioItems.filter(i => i.category !== 'wedding-highlights' && i.category !== 'editing-alone');

  // Combine authentic items
  content.portfolioItems = [...weddingItems, ...editingItems, ...otherItems];

  fs.writeFileSync('content.js', `window.OLYMPUS_CONTENT = ${JSON.stringify(content, null, 2)};\n`);
  console.log(`Successfully updated content.js with exact authentic wedding & editing video items! Total items: ${content.portfolioItems.length}`);
}

run();
