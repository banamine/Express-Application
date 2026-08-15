const fs = require('fs');
let code = fs.readFileSync('src/pages/player2.tsx', 'utf8');

code = code.replace(
  `  useEffect(() => {
    let interval: any;
    const loadPlaylist = async () => {`,
  `  const intervalRef = useRef<any>(null);
  useEffect(() => {
    const loadPlaylist = async () => {`
);

fs.writeFileSync('src/pages/player2.tsx', code);
