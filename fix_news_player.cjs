const fs = require('fs');
let code = fs.readFileSync('src/pages/news-player.tsx', 'utf8');

code = code.replace(
  `  // Network timeout guard
  useEffect(() => {`,
  `  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Network timeout guard
  useEffect(() => {`
);

fs.writeFileSync('src/pages/news-player.tsx', code);
