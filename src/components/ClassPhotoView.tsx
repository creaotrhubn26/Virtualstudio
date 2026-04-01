/**
 * Class Photo 3D View
 * 
 * React Three Fiber component for rendering the class photo scene.
 * Shows students arranged in rows with visibility indicators.
 */

import { useRef, useEffect, useMemo, useState, type FC } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import {
  ClassPhotoSession,
  Student,
  ClassPhotoRow,
  ClassPhotoProp,
} from '../../core/services/classPhotoService';
import {
  createStudentPlaceholder,
  createPhotoRiser,
  createGymBench,
  createStool,
  createAppleBox,
  createFoldingChair,
} from '../../core/models/ClassPhotoModels';
import { ClassPhotoGuides } from './ClassPhotoGuides';
import { ClassPhotoGuideSettings } from '../panels/ClassPhotoPanel';

// =============================================================================
// Types
// =============================================================================

interface ClassPhotoViewProps {
  session: ClassPhotoSession | null;
  selectedStudentId: string | null;
  onStudentClick?: (studentId: string) => void;
  showVisibilityOverlay?: boolean;
  showHeightLabels?: boolean;
  showRowLabels?: boolean;
  guideSettings?: ClassPhotoGuideSettings;
}

interface StudentMeshProps {
  student: Student;
  selected: boolean;
  onClick: () => void;
  showLabel: boolean;
}

// =============================================================================
// Student Mesh Component
// =============================================================================

const StudentMesh: FC<StudentMeshProps> = ({
  student,
  selected,
  onClick,
  showLabel,
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  // Create student model
  const studentModel = useMemo(() => {
    // Teachers use their role color, students use visibility color
    const color = student.isTeacher && student.color
      ? student.color
      : (student.visibilityScore ?? 100) >= 80 ? '#2e7d32' : 
        (student.visibilityScore ?? 100) >= 50 ? '#ed6c02' : '#d32f2f';
    
    return createStudentPlaceholder({
      height: student.height,
      pose: student.pose,
      color,
    });
  }, [student.height, student.pose, student.visibilityScore, student.isTeacher, student.color]);
  
  // Selection highlight
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (selected) {
            child.material = child.material.clone();
            (child.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#2196f3');
            (child.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3;
          }
        }
      });
    }
  }, [selected]);
  
  return (
    <group
      ref={meshRef}
      position={[student.position3D?.x ?? 0, student.position3D?.y ?? 0, student.position3D?.z ?? 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <primitive object={studentModel} />
      
      {/* Selection ring */}
      {(selected || hovered) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.2, 0.25, 32]} />
          <meshBasicMaterial 
            color={selected ? '#2196f3' : '#ffffff'} 
            transparent 
            opacity={0.5}
          />
        </mesh>
      )}
      
      {/* Height/name label */}
      {(showLabel || hovered) && (
        <Html
          position={[0, student.height / 100 + 0.15, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            background: student.isTeacher 
              ? (student.color || '#1565c0')
              : selected ? '#2196f3' : 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            whiteSpace: 'nowrap',
            border: student.isTeacher ? '2px solid rgba(255,255,255,0.5)' : 'none'}}>
            {student.isTeacher && '[T]'}
            {student.name} ({Math.round(student.height)}cm)
          </div>
        </Html>
      )}
      
      {/* Visibility warning */}
      {(student.visibilityScore ?? 100) < 80 && (
        <Html
          position={[0, student.height / 100 + 0.05, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            background: (student.visibilityScore ?? 100) < 50 ? '#f44336' : '#ff9800',
            color: 'white',
            padding: '1px 4px',
            borderRadius: '2px',
            fontSize: '8px'}}>
            {student.visibilityScore ?? 0}%
          </div>
        </Html>
      )}
    </group>
  );
};

// =============================================================================
// Prop Mesh Component
// =============================================================================

const PropMesh: FC<{
  prop: ClassPhotoProp;
}> = ({ prop }) => {
  const propModel = useMemo(() => {
    switch (prop.type) {
      case 'riser':
      case 'photo_riser':
        return createPhotoRiser({ width: prop.width, height: prop.height });
      case 'bench':
      case 'gym_bench':
        return createGymBench({ width: prop.width });
      case 'stool':
        return createStool({ height: prop.height });
      case 'apple_box':
        return createAppleBox({ height: prop.height });
      case 'chair':
      case 'folding_chair':
        return createFoldingChair();
      default:
        return new THREE.Group();
    }
  }, [prop.type, prop.width, prop.height]);
  
  return (
    <group
      position={[prop.position?.x ?? 0, prop.position?.y ?? 0, prop.position?.z ?? 0]}
      rotation={[0, prop.rotation?.y ?? 0, 0]}
    >
      <primitive object={propModel} />
    </group>
  );
};

// =============================================================================
// Row Indicator Component
// =============================================================================

const RowIndicator: FC<{
  row: ClassPhotoRow;
  width: number;
  showLabel: boolean;
}> = ({ row, width, showLabel }) => {
  return (
    <group position={[0, 0.01, row.zPosition ?? 0]}>
      {/* Row line */}
      <Line
        points={[[-width / 2, 0, 0], [width / 2, 0, 0]]}
        color="#ffff00"
        lineWidth={2}
        transparent
        opacity={0.5}
      />
      
      {/* Row label */}
      {showLabel && (
        <Html
          position={[-width / 2 - 0.3, 0, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            background: 'rgba(0,0,0,0.7)',
            color: '#ffff00',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px'}}>
            Row {row.index + 1}
            {(row.baseHeight ?? 0) > 0 && ` (+${Math.round((row.baseHeight ?? 0) * 100)}cm)`}
          </div>
        </Html>
      )}
    </group>
  );
};

// =============================================================================
// Camera Lines (Visibility Check)
// =============================================================================

const VisibilityLines: FC<{
  session: ClassPhotoSession;
  selectedStudentId: string | null;
}> = ({ session, selectedStudentId }) => {
  if (!selectedStudentId) return null;
  
  const student = session.students.get(selectedStudentId);
  if (!student) return null;
  
  const eyeHeight = (student.position3D?.y ?? 0) + (student.height / 100) * 0.9;
  const studentEyePos: [number, number, number] = [
    student.position3D?.x ?? 0,
    eyeHeight,
    student.position3D?.z ?? 0,
  ];
  
  const cameraPos: [number, number, number] = [
    session.cameraPosition?.x ?? 0,
    session.cameraPosition?.y ?? 1.5,
    session.cameraPosition?.z ?? 5,
  ];
  
  return (
    <Line
      points={[studentEyePos, cameraPos]}
      color={(student.visibilityScore ?? 0) >= 80 ? '#4caf50' : '#f44336'}
      lineWidth={2}
      transparent
      opacity={0.5}
      dashed
      dashSize={0.1}
      dashScale={5}
    />
  );
};

// =============================================================================
// Scene Content
// =============================================================================

const DEFAULT_GUIDE_SETTINGS: ClassPhotoGuideSettings = {
  showHeadLines: true,
  showFOV: true,
  showEdgeWarnings: true,
  showSpacingRulers: true,
  showCenterLine: true,
  showHeightGaps: false,
  showEyeLine: false,
  showDOFPreview: false,
  showAspectRatioFrame: false,
  aspectRatio: '4x6',
};

const SceneContent: FC<ClassPhotoViewProps> = ({
  session,
  selectedStudentId,
  onStudentClick,
  showVisibilityOverlay = true,
  showHeightLabels = false,
  showRowLabels = true,
  guideSettings = DEFAULT_GUIDE_SETTINGS,
}) => {
  const { camera } = useThree();
  
  // Update camera position from session
  useEffect(() => {
    if (session) {
      if (session.cameraPosition) camera.position.copy(session.cameraPosition as THREE.Vector3);
      if (session.cameraTarget) camera.lookAt(session.cameraTarget as THREE.Vector3);
    }
  }, [session, camera]);
  
  if (!session) return null;
  
  const students = Array.from(session.students.values());
  const props = Array.from(session.props.values());
  const sceneWidth = session.sceneWidth ?? 8;
  
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-5, 8, -5]} intensity={0.4} />
      
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[sceneWidth + 2, (session.sceneDepth ?? 6) + 4]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
      </mesh>
      
      {/* Grid helper */}
      <gridHelper args={[sceneWidth + 2, 20, '#444', '#333']} />
      
      {/* Row indicators */}
      {session.rows.map((row) => (
        <RowIndicator
          key={row.index}
          row={row}
          width={sceneWidth}
          showLabel={showRowLabels}
        />
      ))}
      
      {/* Props */}
      {props.map((prop) => (
        <PropMesh key={prop.id} prop={prop} />
      ))}
      
      {/* Students */}
      {students.map((student) => (
        <StudentMesh
          key={student.id}
          student={student}
          selected={selectedStudentId === student.id}
          onClick={() => onStudentClick?.(student.id)}
          showLabel={showHeightLabels}
        />
      ))}
      
      {/* Visibility lines */}
      {showVisibilityOverlay && (
        <VisibilityLines
          session={session}
          selectedStudentId={selectedStudentId}
        />
      )}
      
      {/* Visual Guides */}
      <ClassPhotoGuides
        session={session}
        showHeadLines={guideSettings.showHeadLines}
        showFOV={guideSettings.showFOV}
        showEdgeWarnings={guideSettings.showEdgeWarnings}
        showSpacingRulers={guideSettings.showSpacingRulers}
        showCenterLine={guideSettings.showCenterLine}
        showHeightGaps={guideSettings.showHeightGaps}
        showEyeLine={guideSettings.showEyeLine}
        showDOFPreview={guideSettings.showDOFPreview}
        showAspectRatioFrame={guideSettings.showAspectRatioFrame}
        aspectRatio={guideSettings.aspectRatio}
      />
      
      {/* Camera position indicator */}
      <group position={[session.cameraPosition?.x ?? 0, 0, session.cameraPosition?.z ?? 5]}>
        <mesh>
          <coneGeometry args={[0.15, 0.3, 4]} />
          <meshBasicMaterial color="#2196f3" />
        </mesh>
        <Html position={[0, 0.4, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{
            background: '#2196f3',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px'}}>
            Camera
          </div>
        </Html>
      </group>
    </>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export const ClassPhotoView: FC<ClassPhotoViewProps> = (props) => {
  return (
    <Canvas
      shadows
      style={{ background: '#1a1a1a' }}
      camera={{
        fov: 50,
        near: 0.1,
        far: 100,
        position: [0, 2, 8]}}
    >
      <SceneContent {...props} />
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        target={[0, 1, 0]}
        maxPolarAngle={Math.PI / 2}
      />
    </Canvas>
  );
};

export default ClassPhotoView;

