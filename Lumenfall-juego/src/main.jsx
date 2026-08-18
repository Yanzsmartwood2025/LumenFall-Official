import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import './styles.css';
import GameShell from './GameShell.jsx';

window.THREE = window.THREE || THREE;

createRoot(document.getElementById('root')).render(
  <GameShell />,
);
