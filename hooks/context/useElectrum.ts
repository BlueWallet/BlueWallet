import { useContext } from 'react';
import { ElectrumContext, ElectrumContextProps } from '../../components/Context/ElectrumProvider';

const useElectrum = (): ElectrumContextProps => {
  const context = useContext(ElectrumContext);
  if (context === undefined) {
    throw new Error('useElectrum must be used within an ElectrumProvider');
  }
  return context;
};

export { useElectrum };
