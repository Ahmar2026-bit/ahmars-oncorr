import Header from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import MainCanvas from '@/components/MainCanvas';

export default function Home() {
  return (
    <div className="flex flex-col h-screen bg-[#040810] overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <MainCanvas />
        <RightSidebar />
      </div>
    </div>
  );
}
