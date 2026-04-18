import { pdfjs } from 'react-pdf'

// Use Vite's ?url import to get the bundled worker asset URL
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
