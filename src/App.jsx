import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import * as THREE from 'three';
import { 
  FileText, Code, Terminal, Globe, Crown, Zap, Smile, Camera, 
  Menu, X, Phone, Mail, MapPin, Bus, HelpCircle 
} from 'lucide-react';
import FloatingRobot from './chatbot/FloatingRobot.jsx';
import IntroSplash from './IntroSplash.jsx';

// --- Data definitions matching exact Replit source ---

const technicalEvents = [
  {
    num: "01",
    title: "WebNova",
    icon: <Globe size={24} />,
    category: "Frontend Web Development",
    participants: "Official Slot",
    teamSize: "Individual",
    teaser: "Build a responsive website using HTML, CSS, JavaScript, Bootstrap, or Tailwind CSS within the given time.",
    rules: [
      "Individual participation only.",
      "Time limit: 40 minutes.",
      "Development tool: Visual Studio Code only.",
      "Mobile phones and AI tools are strictly prohibited.",
      "Browser extensions, templates, pre-built code, and frameworks are not allowed except Bootstrap and Tailwind CSS.",
      "Evaluation is based on creativity, UI/UX, responsiveness, HTML/CSS/JS implementation, code quality, and functionality."
    ],
    organiser: "As per official TECHNOVANZA '26 rulebook"
  },
  {
    num: "02",
    title: "TechTalks",
    icon: <FileText size={24} />,
    category: "Technical Presentation",
    participants: "Screened Teams",
    teamSize: "Team of 2",
    teaser: "Present a technical topic with a PPT and working prototype/demo after selection by the organizing team.",
    rules: [
      "Open technical topic of the participants' choice.",
      "Team participation only: 2 members per team.",
      "PPT submission is mandatory for screening.",
      "PPT must be submitted 5 days before the event through the organizer-provided Google Drive link.",
      "Only teams receiving confirmation email can present on event day.",
      "Presentation time: 7 minutes; Q&A: 3 minutes.",
      "A working prototype/model/demo must be presented."
    ],
    organiser: "As per official TECHNOVANZA '26 rulebook"
  },
  {
    num: "03",
    title: "Prompt Maestro",
    icon: <Terminal size={24} />,
    category: "AI Prompt Engineering",
    participants: "Official Slot",
    teamSize: "Individual",
    teaser: "Compete in AI prompt engineering challenges, then generate a responsive web page using prompt-based AI tools.",
    rules: [
      "Individual participation only.",
      "Round 1: Vision 2 Prompt with AI-based tasks.",
      "Participants may refine prompts multiple times within the allotted time.",
      "Manual editing of AI-generated output is not allowed unless specified.",
      "Round 2: Dream 2 DOM, AI-powered web development.",
      "Manual coding is strictly prohibited in Round 2.",
      "Time limit: 60 minutes per round."
    ],
    organiser: "As per official TECHNOVANZA '26 rulebook"
  },
  {
    num: "04",
    title: "CodeFusion",
    icon: <Code size={24} />,
    category: "Coding Contest",
    participants: "30",
    teamSize: "Individual",
    teaser: "A two-round coding contest with a technical quiz followed by HackerRank debugging and coding challenges.",
    rules: [
      "Total participants: 30.",
      "Participants are split into two batches of 15 to avoid event conflicts.",
      "Round 1: Technical Quiz conducted offline with paper and pen.",
      "Top 7 participants from each batch qualify for Round 2.",
      "Round 2: HackerRank debugging and coding challenge.",
      "Debugging is available in C, Python, and Java.",
      "Final winners are decided based on Round 2 performance, with more emphasis on coding."
    ],
    organiser: "As per official TECHNOVANZA '26 rulebook"
  }
];

const nonTechnicalEvents = [
  {
    num: "01",
    title: "Fun Feast",
    icon: <Smile size={24} />,
    category: "Fun Games",
    participants: "Official Slot",
    teamSize: "As per event rules",
    teaser: "A set of eight fun games where participants compete for the highest overall score.",
    rules: [
      "The event consists of 8 fun games.",
      "Each game has a time limit of 2 minutes.",
      "Participants must follow the game rules.",
      "Judges' decisions must be followed.",
      "The team with the highest overall score will be declared the winner."
    ],
    organiser: "As per official TECHNOVANZA '26 rulebook"
  },
  {
    num: "02",
    title: "Brain Battle",
    icon: <Zap size={24} />,
    category: "Quiz Challenge",
    participants: "Official Slot",
    teamSize: "Individual",
    teaser: "An individual quiz challenge covering current affairs, cinema, general knowledge, and memes.",
    rules: [
      "Individual participation only; team participation is not allowed.",
      "Questions cover current affairs, cinema, general knowledge, and memes.",
      "Mobile phones, smartwatches, notes, and external help are not allowed.",
      "Buzzer round follows first-come, first-served order.",
      "Each answer must be given within 30 seconds.",
      "Quiz Master's decision is final.",
      "Tie-breaker round will be conducted in case of a tie."
    ],
    organiser: "As per official TECHNOVANZA '26 rulebook"
  },
  {
    num: "03",
    title: "Nexus",
    icon: <Camera size={24} />,
    category: "Image Connection",
    participants: "Official Slot",
    teamSize: "As per event rules",
    teaser: "Observe image sets, press the buzzer, and identify the correct connection before others.",
    rules: [
      "Participants will be shown a set of images.",
      "Participants may press the buzzer after the images are displayed.",
      "The first participant to press the buzzer gets the first chance.",
      "If the first participant answers incorrectly, the chance passes based on buzzer order.",
      "The team with the highest number of correct answers wins.",
      "There is no negative marking."
    ],
    organiser: "As per official TECHNOVANZA '26 rulebook"
  },
  {
    num: "04",
    title: "Checkmate Challenge",
    icon: <Crown size={24} />,
    category: "Chess",
    participants: "Official Slot",
    teamSize: "Individual",
    teaser: "A chess challenge following standard rules, touch-move discipline, and a one-hour checkmate condition.",
    rules: [
      "Follow all standard chess rules.",
      "White always makes the first move.",
      "Touch-move rule applies.",
      "Mobile phones, cheating, and outside assistance are strictly prohibited.",
      "The player who checkmates the opponent within one hour wins.",
      "If no checkmate occurs within one hour, winner is decided according to tournament rules."
    ],
    organiser: "As per official TECHNOVANZA '26 rulebook"
  }
];

// --- 3D Wave Mesh Background Canvas Component (Three.js wireframe) ---
const WaveCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let scene, camera, renderer, planeMesh, clock;
    let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let animationId;

    const GRID_SIZE_X = 60;
    const GRID_SIZE_Y = 60;
    const SEGMENTS_X = 75;
    const SEGMENTS_Y = 75;

    const init = () => {
      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x030303, 0.025);

      camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(0, -18, 15);
      camera.lookAt(0, 5, 0);

      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      const geometry = new THREE.PlaneGeometry(GRID_SIZE_X, GRID_SIZE_Y, SEGMENTS_X, SEGMENTS_Y);
      const material = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        wireframe: true,
        transparent: true,
        opacity: 0.25
      });

      planeMesh = new THREE.Mesh(geometry, material);
      scene.add(planeMesh);
    };

    const onMouseMove = (event) => {
      mouse.targetX = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.targetY = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    const onTouchMove = (event) => {
      if (event.touches.length > 0) {
        mouse.targetX = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
        mouse.targetY = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
      }
    };

    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      camera.position.x = mouse.x * 3;
      camera.lookAt(0, 5, 0);

      const geometry = planeMesh.geometry;
      const posAttribute = geometry.attributes.position;

      for (let i = 0; i < posAttribute.count; i++) {
        const x = posAttribute.getX(i);
        const y = posAttribute.getY(i);

        const distanceToMouse = Math.sqrt(
          Math.pow(x - mouse.x * 20, 2) + Math.pow(y - mouse.y * 20, 2)
        );

        const zWave = Math.sin(x * 0.3 + elapsedTime * 1.5) * 0.8 +
                      Math.cos(y * 0.3 + elapsedTime * 1.5) * 0.8;

        const mouseRipple = Math.sin(distanceToMouse * 0.5 - elapsedTime * 4) *
                      Math.max(0, (10 - distanceToMouse) * 0.25);

        posAttribute.setZ(i, zWave + mouseRipple);
      }

      posAttribute.needsUpdate = true;
      renderer.render(scene, camera);
    };

    init();
    clock = new THREE.Clock();
    animate();

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      renderer.dispose();
      planeMesh.geometry.dispose();
      planeMesh.material.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} id="wave-canvas" />;
};

// --- Stat Box Component ---
const StatBox = ({ end, label, suffix = '' }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isInView) {
      let startTime;
      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / 2000, 1);
        const easeOut = 1 - Math.pow(1 - progress, 4);
        setCount(Math.floor(easeOut * end));
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }
  }, [isInView, end]);

  return (
    <div className="stat-box" ref={ref}>
      <div className="num">
        {count < 10 && end < 10 ? `0${count}` : count}
        {suffix}
      </div>
      <div className="lbl">{label}</div>
    </div>
  );
};

// --- Event Card 3D Flip Component ---
const EventCard = ({ event, index }) => {
  const [flipped, setFlipped] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.12 }}
      className="event-card-wrapper"
    >
      <motion.div
        className="event-card"
        onClick={() => setFlipped(!flipped)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setFlipped(!flipped);
          }
        }}
        tabIndex={0}
        role="button"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
      >
        {/* Card Front */}
        <div className="card-face card-front">
          <div className="card-top-strip">
            <div className="card-event-num">{event.num}</div>
            <div className="card-icon-circle">{event.icon}</div>
          </div>
          <div className="card-body">
            <h3>{event.title}</h3>
            <div className="card-cat">{event.category}</div>
            <div className="participant-pill">Participants: {event.participants}</div>
            <p className="card-teaser">{event.teaser}</p>
            <div className="card-tap-hint">
              Tap to view details <span style={{ color: 'var(--glow)', marginLeft: 4 }}>▸</span>
            </div>
          </div>
        </div>

        {/* Card Back */}
        <div className="card-face card-back" style={{ transform: 'rotateY(180deg)' }}>
          <div className="close-hint">Tap to close</div>
          <h4>{event.title}</h4>
          <div className="meta-row">
            <span className="meta-pill">{event.teamSize}</span>
            <span className="meta-pill">Cap: {event.participants}</span>
          </div>
          <ul className="rules-list">
            {event.rules.map((rule, idx) => (
              <li key={idx}>{rule}</li>
            ))}
          </ul>
          <div className="card-organiser">
            Organiser: <b>{event.organiser}</b>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- Main App Component ---
export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <IntroSplash />
      <WaveCanvas />

      <div className="glow-bg" style={{ top: '8%', left: '50%', transform: 'translateX(-50%)' }} />

      {/* Navigation */}
      <nav>
        <div className="nav-wrap">
          <a href="#home" className="logo">
            TECHNO<span>VANZA</span>
          </a>
          <ul className={`nav-links ${mobileMenuOpen ? 'open' : ''}`}>
            <li><a href="#home" onClick={() => setMobileMenuOpen(false)}>Home</a></li>
            <li><a href="#technical" onClick={() => setMobileMenuOpen(false)}>Technical</a></li>
            <li><a href="#nontechnical" onClick={() => setMobileMenuOpen(false)}>Non-Technical</a></li>
            <li><a href="#about" onClick={() => setMobileMenuOpen(false)}>About</a></li>
            <li><a href="#contact" onClick={() => setMobileMenuOpen(false)}>Contact</a></li>
          </ul>
          <button
            className="nav-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero" id="home">
        <div className="hero-content">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="glitch-wrapper">
              <span className="glitch-tet" data-text="TECHNOVANZA 2026">
                TECHNO<span className="tech">VANZA</span> 2026
              </span>
            </h1>
            <p className="college-line">
              <b>Anjalai Ammal Mahalingam Engineering College</b>
            </p>
            <p className="desc">Department of Computer Science & Engineering</p>
          </motion.div>

          {/* Developer SVG Animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="developer-animation anim-glow"
          >
            <svg viewBox="0 0 700 350" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="100" y="280" width="500" height="12" rx="6" fill="#1F1F1F" />
              <rect x="330" y="230" width="40" height="50" fill="#0D0D0D" />
              <path d="M 300 280 L 400 280 L 380 270 L 320 270 Z" fill="#1A1A1A" />
              <rect x="180" y="70" width="340" height="170" rx="10" fill="#0A0A0A" stroke="#DC2626" strokeWidth="3" />
              <rect x="190" y="80" width="320" height="150" rx="4" fill="#030303" />
              <path d="M 190 84 C 190 81.7 191.7 80 194 80 L 506 80 C 508.2 80 510 81.7 510 84 L 510 98 L 190 98 Z" fill="#121212" />
              <circle cx="205" cy="89" r="4" fill="#EF4444" />
              <circle cx="217" cy="89" r="4" fill="#F59E0B" />
              <circle cx="229" cy="89" r="4" fill="#10B981" />
              <text x="245" y="93" fill="#666" fontFamily="monospace" fontSize="10">main.py - TECHNOVANZA_2026</text>
              <g fontFamily="monospace" fontSize="11" fontWeight="bold">
                <text x="205" y="120" fill="#DC2626">&gt; import</text>
                <text x="260" y="120" fill="#FEE2E2">innovation, ai</text>
                <text x="205" y="140" fill="#7F1D1D">class</text>
                <text x="245" y="140" fill="#EF4444">CSE_Developer</text>
                <text x="345" y="140" fill="#FEE2E2">:</text>
                <g>
                  <text x="220" y="160" fill="#991B1B">def</text>
                  <text x="250" y="160" fill="#FEE2E2">build_future(self):</text>
                </g>
                <text x="235" y="180" fill="#EF4444">return</text>
                <text x="285" y="180" fill="#10B981">"VICTORY 2026"</text>
                <rect x="390" y="170" width="7" height="12" fill="#EF4444" className="anim-cursor" />
              </g>
              <rect x="190" y="195" width="320" height="35" fill="#000000" opacity="0.7" />
              <text x="200" y="210" fill="#10B981" fontFamily="monospace" fontSize="9">[SUCCESS] Compiling TechnoVanza.exe ...</text>
              <text x="200" y="222" fill="#EF4444" fontFamily="monospace" fontSize="9">[STATUS] Ready to compete. Access granted.</text>
              
              <g className="anim-float-1">
                <rect x="80" y="100" width="80" height="40" rx="8" fill="#0A0A0A" stroke="#DC2626" strokeWidth="1.5" />
                <text x="92" y="125" fill="#EF4444" fontFamily="monospace" fontSize="12" fontWeight="bold">&lt;CODE/&gt;</text>
              </g>
              <g className="anim-float-2">
                <circle cx="600" cy="110" r="22" fill="#0A0A0A" stroke="#EF4444" strokeWidth="1.5" />
                <path d="M 590 110 L 610 110 M 600 100 L 600 120 M 593 103 L 607 117" stroke="#DC2626" strokeWidth="2" />
                <circle cx="600" cy="110" r="4" fill="#FEE2E2" />
              </g>
              <g className="anim-float-1" style={{ animationDelay: '1.5s' }}>
                <rect x="560" y="200" width="75" height="35" rx="6" fill="#0A0A0A" stroke="#7F1D1D" strokeWidth="1.5" />
                <text x="572" y="222" fill="#10B981" fontFamily="monospace" fontSize="11">0100101</text>
              </g>
            </svg>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="info"
          >
            <div className="badge">29th August 2026, AC Conference Hall</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="hero-cta"
          >
            <a href="#contact" className="btn">Download the Rules PDF</a>
            {/* <a href="#technical" className="btn-outline">View Events</a> */}
          </motion.div>
        </div>
      </section>

      {/* Technical Events Section */}
      <section className="section" id="technical">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-head"
        >
          {/* <p className="eyebrow">// Technical Track</p> */}
          <h2>Technical <span>Events</span></h2>
          <p>Official technical events from the TECHNOVANZA '26 rulebook. Tap a card to view rules.</p>
        </motion.div>

        <div className="event-grid">
          {technicalEvents.map((event, index) => (
            <EventCard key={index} event={event} index={index} />
          ))}
        </div>
      </section>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="divider-label"
      >
        Beyond The Terminal
      </motion.div>

      {/* Non-Technical Events Section */}
      <section className="section" id="nontechnical">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-head"
        >
          {/* <p className="eyebrow">// Off-Duty Track</p> */}
          <h2>Non-Technical <span>Events</span></h2>
          <p>Official non-technical events from the TECHNOVANZA '26 rulebook. Tap a card to view rules.</p>
        </motion.div>

        <div className="event-grid">
          {nonTechnicalEvents.map((event, index) => (
            <EventCard key={index} event={event} index={index} />
          ))}
        </div>
      </section>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        style={{ textAlign: 'center', marginTop: '40px', marginBottom: '80px', position: 'relative', zIndex: 2 }}
      >
        <a href="https://technovanza-2026-cex6.onrender.com/registration" className="btn" style={{ padding: '14px 32px', fontSize: '16px' }}>
          Register Now
        </a>
      </motion.div>

      {/* About Section */}
      <section className="section" id="about">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-head"
        >
          {/* <p className="eyebrow">// Know Us</p> */}
          <h2>About <span>Technovanza</span></h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="about-container"
        >
          <div className="about-wrap">
            <div className="about-text">
              <p>
                Technovanza 2026 is the annual national-level technical symposium hosted by the Department of Computer Science & Engineering at Anjalai Ammal Mahalingam Engineering College.
              </p>
              <p>
                Built by students for students, the symposium brings together coders, builders, and thinkers from across the region for a single day of competition, learning, and exchange — spanning coding arenas, AI challenges, research showcases, and events built purely for fun.
              </p>
              <p>
                The official event lineup includes WebNova, TechTalks, Prompt Maestro, CodeFusion, Fun Feast, Brain Battle, Nexus, and Checkmate Challenge.
              </p>
            </div>

            <div className="stat-grid">
              <StatBox end={8} label="Events" />
              <StatBox end={100} suffix="+" label="Participants" />
              <StatBox end={1} label="Day, All In" />
              <StatBox end={2026} label="Edition" />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Coordinators Section */}
      <section className="section" id="coordinators">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-head"
        >
          {/* <p className="eyebrow">// The Team</p> */}
          <h2>Meet the <span>Coordinators</span></h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="coord-container"
        >
          {/* Top Row: Principal & HOD */}
         
<div className="coord-top-row">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="coord-card"
            >
              <div className="coord-role-tag">Principal</div>
              {/* <div className="coord-avatar coord-avatar--principal">V</div> */}
              <div className="coord-name">Dr. K. Velmurugan</div>
    {/* starting quotes lines */}
      <div className="coord-designation coord-designation--dept">
                Dept. of Computer Science & Engineering
              </div>
              <ul className="hod-lines">
                <li>Steering 8 cross-discipline events for 100+ participants across the region.</li>
                <li>Fostering technical excellence and innovation through competitive learning.</li>
                <li>The driving force behind Technovanza — where ideas meet execution.</li>
              </ul>
              <div className="hod-quote-mark">"</div>
   {/* ending quotes lines */}


            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="coord-card coord-card--hod"
            >
              <div className="hod-glow-ring" />
              <div className="coord-role-tag coord-role-tag--hod">Head of Department</div>
              {/* <div className="coord-avatar coord-avatar--hod">V</div> */}
              <div className="coord-name coord-name--hod">Dr.T. Vigneswari</div>
              <div className="coord-designation coord-designation--dept">
                Dept. of Computer Science & Engineering
              </div>
              <ul className="hod-lines">
                <li>Welcome to CSE Symposium 2026! This event is a platform for students to showcase their technical prowess and creative thinking. I encourage every student to participate and make the most of this opportunity.</li>
                
              </ul>
              <div className="hod-quote-mark">"</div>
            </motion.div>
          </div>


          {/* Bottom Row: Staff & Student Coordinators */}
          <div className="coord-bottom-row">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="coord-card"
            >
              <div className="coord-role-tag">Staff Co-ordinators</div>
              <div className="coord-members">
                <div className="coord-member">
                  {/* <div className="coord-avatar coord-avatar--sm">M</div> */}
                  <div>
                    <div className="coord-name">Mr.P.Manikandan</div>
                    <div className="coord-designation">Assistant Professor, CSE Department</div>
                  </div>
                </div>
                <div className="coord-divider" />
                <div className="coord-member">
                  {/* <div className="coord-avatar coord-avatar--sm">N</div> */}
                  <div>
                    <div className="coord-name">Mrs.K.Nithya</div>
                    <div className="coord-designation">Assistant Professor, CSE Department</div>
                  </div>
                </div>
              </div>
            </motion.div>


             <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="coord-card"
            >
              <div className="coord-role-tag">Student Co-ordinators</div>
              <div className="coord-members">
                <div className="coord-member">
                  {/* <div className="coord-avatar coord-avatar--sm">M</div> */}
                  <div>
                    <div className="coord-name">A.V. Lekka</div>
                    <div className="coord-designation">Student Co-ordinator · Contact: 9842154992</div>
                  </div>
                </div>
                <div className="coord-divider" />
                <div className="coord-member">
                  {/* <div className="coord-avatar coord-avatar--sm">N</div> */}
                  <div>
                    <div className="coord-name">S.Vijay Narayan</div>
                    <div className="coord-designation">Student Co-ordinator · Contact: 8668052217</div>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </motion.div>
      </section>

      {/* Contact & Venue Section */}
      <section className="section" id="contact">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-head"
        >
          {/* <p className="eyebrow">// Reach Us</p> */}
          <h2>Contact <span>& Venue</span></h2>
          <p>Questions about events, teams, or registration — reach out directly.</p>
        </motion.div>

        {/* Registration Help Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="reg-help-banner"
        >
          <div className="reg-help-icon">
            <Phone size={18} />
          </div>
          <div className="reg-help-text">
            <span className="reg-help-title">Facing any problem with registration?</span>
            <span className="reg-help-title">Reach one of these numbers immediately</span>
          </div>
          <div className="reg-help-contacts">
            <a href="tel:+919600496137" className="reg-contact-item">
              <span className="reg-contact-name">Madhavan</span>
              <span className="reg-help-title">96004 96137</span>
            </a>

                <a href="tel:+918637689191" className="reg-contact-item">
              <span className="reg-contact-name">Niveesh</span>
              <span className="reg-help-title">8637689191</span>
            </a>
           
               <a href="tel:+919042845757" className="reg-contact-item">
              <span className="reg-contact-name">Naveen</span>
              <span className="reg-help-title">9042845757</span>
            </a>

            <a href="tel:+918124234995" className="reg-contact-item">
              <span className="reg-contact-name">Vignesh</span>
              <span className="reg-help-title">8124234995</span>
            </a>

            <a href="tel:+916379555905" className="reg-contact-item">
              <span className="reg-contact-name">Kavinathan</span>
              <span className="reg-help-title">379555905</span>
            </a>

            <a href="tel:+918072022294" className="reg-contact-item">
              <span className="reg-contact-name">Anwar</span>
              <span className="reg-help-title">8072022294</span>
            </a>

          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="contact-grid"
        >
          {/* Email Card */}

          <div className="contact-card">
            <div className="contact-card-icon">
              <Mail size={20} />
            </div>
            <h4>Email Us</h4>
            <div className="role">Official Event Mail</div>
            <a href="mailto:Technovanza2026@gmail.com">Technovanzacse26@gmail.com</a>
          </div>

          {/* Registration Support Card */}
          {/* <div className="contact-card">
            <div className="contact-card-icon">
              <Phone size={20} />
            </div>
            <h4>M. Madhavan</h4>
            <div className="role">Registration Support</div>
            <a href="tel:+919600496137">+91 96004 96137</a>
          </div> */}

          {/* Venue Box */}
          <div className="venue-box">
            <div className="venue-info-block">
              <span>
                <MapPin size={14} style={{ display: 'inline', marginRight: 6 }} />
                Venue
              </span>
              AC Conference Hall,<br />
              Anjalai Ammal Mahalingam Engg College,<br />
              Kovilvenni, Thiruvarur – 614 403
            </div>

            <div className="venue-info-block">
              <span>Date & Time</span>
              August 29, 2026<br />
              08:30 AM — 04:30 PM
            </div>

            <div className="venue-info-block">
              <span>
                <Bus size={14} style={{ display: 'inline', marginRight: 6 }} />
                Bus Route (OUT BUS)
              </span>
              <div className="bus-route-list">
                <div className="bus-route-item">
                  <span className="bus-route-dir">Thiruvarur → Thanjavur</span>
                  <span className="bus-route-stop">Get off at Kovilvenni Stop</span>
                </div>
                <div className="bus-route-item">
                  <span className="bus-route-dir">Thanjavur → Thiruvarur</span>
                  <span className="bus-route-stop">Get off at Kovilvenni Stop</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Map Container */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="map-container"
        >
          <div className="map-label">
            <MapPin size={14} />
            <span>Find Us on the Map</span>
          </div>
          <div className="map-frame-wrap">
            <iframe
              title="Anjalai Ammal Mahalingam Engineering College"
              src="https://maps.google.com/maps?q=Anjalai+Ammal+Mahalingam+Engineering+College+Kovilvenni+Thiruvarur&output=embed&z=14"
              width="100%"
              height="360"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer>
        <div>© 2026 Technovanza. All rights reserved.</div>
        <div className="foot-tag">System Sequence Complete</div>
      </footer>

      <FloatingRobot />
    </>
  );
}
