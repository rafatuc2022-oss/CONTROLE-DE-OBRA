import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  writeBatch,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Obra, Entrada, Saida, MaoObra, Material, ComparacaoPreco, PagamentoMaoObra } from '../types';
import { useNotification } from '../context/NotificationContext';

export function useObraData(userId: string | null) {
  const { showToast } = useNotification();
  const [obras, setObras] = useState<Obra[]>([]);
  const [selectedObraId, setSelectedObraId] = useState<string | null>(null);
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [saidas, setSaidas] = useState<Saida[]>([]);
  const [maoObra, setMaoObra] = useState<MaoObra[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [comparacoes, setComparacoes] = useState<ComparacaoPreco[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 1. Fetch Obras
  useEffect(() => {
    if (!userId) {
      setObras([]);
      setSelectedObraId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'obras'), where('usuarioId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const obrasData: Obra[] = [];
      snapshot.forEach((doc) => {
        obrasData.push({ id: doc.id, ...doc.data() } as Obra);
      });
      setObras(obrasData);
      
      // Select the first project if none is selected
      if (obrasData.length > 0 && !selectedObraId) {
        setSelectedObraId(obrasData[0].id);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error loading projects: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  // 2. Fetch Comparacoes (Global/User scoped)
  useEffect(() => {
    if (!userId) {
      setComparacoes([]);
      return;
    }

    const q = query(collection(db, 'comparacaoPrecos'), where('usuarioId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const compData: ComparacaoPreco[] = [];
      snapshot.forEach((doc) => {
        compData.push({ id: doc.id, ...doc.data() } as ComparacaoPreco);
      });
      setComparacoes(compData);
    });

    return () => unsubscribe();
  }, [userId]);

  // 3. Fetch Selected Obra Sub-data (Entradas, Saidas, MaoObra, Materiais)
  useEffect(() => {
    if (!selectedObraId) {
      setEntradas([]);
      setSaidas([]);
      setMaoObra([]);
      setMateriais([]);
      return;
    }

    const unsubscribes = [
      onSnapshot(query(collection(db, 'entradas'), where('obraId', '==', selectedObraId)), (snapshot) => {
        const data: Entrada[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Entrada);
        });
        setEntradas(data);
      }),

      onSnapshot(query(collection(db, 'saidas'), where('obraId', '==', selectedObraId)), (snapshot) => {
        const data: Saida[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Saida);
        });
        setSaidas(data);
      }),

      onSnapshot(query(collection(db, 'maoObra'), where('obraId', '==', selectedObraId)), (snapshot) => {
        const data: MaoObra[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as MaoObra);
        });
        setMaoObra(data);
      }),

      onSnapshot(query(collection(db, 'materiais'), where('obraId', '==', selectedObraId)), (snapshot) => {
        const data: Material[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Material);
        });
        setMateriais(data);
      })
    ];

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [selectedObraId]);

  // Helper: Re-calculate projects balance by querying Firestore directly
  const updateProjectBalance = async (obraId: string, customNewSaldo?: number) => {
    const obraRef = doc(db, 'obras', obraId);
    
    if (customNewSaldo !== undefined) {
      await updateDoc(obraRef, { saldoAtual: customNewSaldo });
      return;
    }

    try {
      const obraSnap = await getDoc(obraRef);
      if (!obraSnap.exists()) return;
      const obraData = obraSnap.data();
      const saldoInicial = Number(obraData.saldoInicial || 0);

      // Fetch all entries for this project from server to get accurate sum
      const entradasQuery = query(collection(db, 'entradas'), where('obraId', '==', obraId));
      const entradasSnap = await getDocs(entradasQuery);
      let sumEntradas = 0;
      entradasSnap.forEach((doc) => {
        sumEntradas += Number(doc.data().valor || 0);
      });

      // Fetch all expenses for this project from server to get accurate sum
      const saidasQuery = query(collection(db, 'saidas'), where('obraId', '==', obraId));
      const saidasSnap = await getDocs(saidasQuery);
      let sumSaidas = 0;
      saidasSnap.forEach((doc) => {
        sumSaidas += Number(doc.data().valor || 0);
      });

      const calculatedBalance = saldoInicial + sumEntradas - sumSaidas;
      await updateDoc(obraRef, { saldoAtual: calculatedBalance });
    } catch (err) {
      console.error("Error updating project balance:", err);
    }
  };

  // 4. Data Operations
  const addObra = async (obraData: Omit<Obra, 'id' | 'usuarioId' | 'saldoAtual' | 'criadoEm'>) => {
    if (!userId) return;
    try {
      const newObra = {
        ...obraData,
        usuarioId: userId,
        saldoAtual: obraData.saldoInicial,
        criadoEm: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'obras'), newObra);
      showToast('Nova obra cadastrada com sucesso!', 'success');
      return docRef;
    } catch (err: any) {
      showToast('Erro ao cadastrar obra: ' + err.message, 'error');
      throw err;
    }
  };

  const updateObra = async (obraId: string, updateFields: Partial<Obra>) => {
    try {
      await updateDoc(doc(db, 'obras', obraId), updateFields);
      showToast('Dados da obra atualizados!', 'success');
    } catch (err: any) {
      showToast('Erro ao atualizar obra: ' + err.message, 'error');
      throw err;
    }
  };

  const deleteObra = async (obraId: string) => {
    try {
      await deleteDoc(doc(db, 'obras', obraId));
      if (selectedObraId === obraId) {
        const remaining = obras.filter(o => o.id !== obraId);
        setSelectedObraId(remaining.length > 0 ? remaining[0].id : null);
      }
      showToast('Obra excluída com sucesso!', 'success');
    } catch (err: any) {
      showToast('Erro ao excluir obra: ' + err.message, 'error');
      throw err;
    }
  };

  const addEntrada = async (entrada: Omit<Entrada, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'entradas'), entrada);
      // Trigger balance update
      setTimeout(() => updateProjectBalance(entrada.obraId), 200);
      showToast('Entrada financeira registrada com sucesso!', 'success');
      return docRef;
    } catch (err: any) {
      showToast('Erro ao registrar entrada: ' + err.message, 'error');
      throw err;
    }
  };

  const deleteEntrada = async (entrada: Entrada) => {
    try {
      await deleteDoc(doc(db, 'entradas', entrada.id));
      setTimeout(() => updateProjectBalance(entrada.obraId), 200);
      showToast('Entrada financeira removida com sucesso!', 'success');
    } catch (err: any) {
      showToast('Erro ao remover entrada: ' + err.message, 'error');
      throw err;
    }
  };

  const addSaida = async (saida: Omit<Saida, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'saidas'), saida);
      setTimeout(() => updateProjectBalance(saida.obraId), 200);
      showToast('Saída/Despesa financeira registrada!', 'success');
      return docRef;
    } catch (err: any) {
      showToast('Erro ao registrar saída: ' + err.message, 'error');
      throw err;
    }
  };

  const deleteSaida = async (saida: Saida) => {
    try {
      await deleteDoc(doc(db, 'saidas', saida.id));
      setTimeout(() => updateProjectBalance(saida.obraId), 200);
      showToast('Despesa financeira removida!', 'success');
    } catch (err: any) {
      showToast('Erro ao excluir despesa: ' + err.message, 'error');
      throw err;
    }
  };

  const addMaoObra = async (record: Omit<MaoObra, 'id'>) => {
    try {
      const newRecord = {
        ...record,
        valor: record.valor || 0,
        valorContrato: record.valorContrato || record.valor || 0,
        pagamentos: record.pagamentos || []
      };
      const docRef = await addDoc(collection(db, 'maoObra'), newRecord);
      
      // If there are initial payments, add them to saidas
      if (newRecord.pagamentos && newRecord.pagamentos.length > 0) {
        for (const p of newRecord.pagamentos) {
          const saidaRecord = {
            obraId: record.obraId,
            valor: p.valor,
            data: p.data,
            categoria: 'Mão de obra' as const,
            descricao: `Vale/Pgto: ${record.nome} (${record.funcao})`,
            observacao: p.observacao || '',
            maoObraId: docRef.id,
            paymentId: p.id
          };
          await addDoc(collection(db, 'saidas'), saidaRecord);
        }
      }
      
      setTimeout(() => updateProjectBalance(record.obraId), 200);
      showToast(`Profissional ${record.nome} cadastrado com sucesso!`, 'success');
      return docRef;
    } catch (err: any) {
      showToast('Erro ao cadastrar profissional: ' + err.message, 'error');
      throw err;
    }
  };

  const deleteMaoObra = async (record: MaoObra) => {
    try {
      await deleteDoc(doc(db, 'maoObra', record.id));
      
      // Find all matching outcomes (saidas) linked to this labor record to delete them all
      const matchingSaidasQuery = query(collection(db, 'saidas'), where('maoObraId', '==', record.id));
      const matchingSaidasSnap = await getDocs(matchingSaidasQuery);
      for (const d of matchingSaidasSnap.docs) {
        await deleteDoc(doc(db, 'saidas', d.id));
      }

      // Legacy support: if there are outcomes that matched by name/value but did not have maoObraId
      const legacySaidas = saidas.filter(s => 
        s.obraId === record.obraId && 
        s.categoria === 'Mão de obra' &&
        !s.maoObraId &&
        s.valor === record.valor &&
        s.data === record.dataPagamento
      );
      for (const ls of legacySaidas) {
        await deleteDoc(doc(db, 'saidas', ls.id));
      }

      setTimeout(() => updateProjectBalance(record.obraId), 200);
      showToast(`Profissional ${record.nome} removido do sistema!`, 'success');
    } catch (err: any) {
      showToast('Erro ao excluir profissional: ' + err.message, 'error');
      throw err;
    }
  };

  const addMaterial = async (record: Omit<Material, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'materiais'), record);
      // Add to Comparador de Preços database
      const compRecord = {
        usuarioId: userId || '',
        material: record.nome,
        loja: record.loja,
        valor: record.valorUnitario,
        data: record.dataCompra
      };
      await addDoc(collection(db, 'comparacaoPrecos'), compRecord);

      // Add corresponding financial outcome automatically
      const saidaRecord = {
        obraId: record.obraId,
        valor: record.valorTotal,
        data: record.dataCompra,
        categoria: 'Material' as const,
        descricao: `Material: ${record.nome} (${record.quantidade} ${record.unidade})`,
        observacao: record.observacao || ''
      };
      await addDoc(collection(db, 'saidas'), saidaRecord);
      setTimeout(() => updateProjectBalance(record.obraId), 200);
      showToast(`Material ${record.nome} cadastrado com sucesso!`, 'success');
      return docRef;
    } catch (err: any) {
      showToast('Erro ao cadastrar material: ' + err.message, 'error');
      throw err;
    }
  };

  const deleteMaterial = async (record: Material) => {
    try {
      await deleteDoc(doc(db, 'materiais', record.id));

      // Find matching outcome in our current state list to delete it as well
      const matchingSaida = saidas.find(s => 
        s.obraId === record.obraId && 
        s.categoria === 'Material' &&
        s.valor === record.valorTotal &&
        s.data === record.dataCompra
      );
      if (matchingSaida) {
        await deleteDoc(doc(db, 'saidas', matchingSaida.id));
      }

      // Also delete from price comparisons database if matching
      const matchingComp = comparacoes.find(c => 
        c.material === record.nome && 
        c.loja === record.loja && 
        c.valor === record.valorUnitario &&
        c.data === record.dataCompra
      );
      if (matchingComp) {
        await deleteDoc(doc(db, 'comparacaoPrecos', matchingComp.id));
      }

      setTimeout(() => updateProjectBalance(record.obraId), 200);
      showToast(`Material ${record.nome} excluído com sucesso!`, 'success');
    } catch (err: any) {
      showToast('Erro ao excluir material: ' + err.message, 'error');
      throw err;
    }
  };

  const updateEntrada = async (id: string, updatedFields: Partial<Entrada>) => {
    try {
      await updateDoc(doc(db, 'entradas', id), updatedFields);
      const obraId = updatedFields.obraId || (entradas.find(e => e.id === id)?.obraId);
      if (obraId) {
        setTimeout(() => updateProjectBalance(obraId), 200);
      }
      showToast('Entrada financeira atualizada com sucesso!', 'success');
    } catch (err: any) {
      showToast('Erro ao atualizar entrada: ' + err.message, 'error');
      throw err;
    }
  };

  const updateSaida = async (id: string, updatedFields: Partial<Saida>) => {
    try {
      await updateDoc(doc(db, 'saidas', id), updatedFields);
      const obraId = updatedFields.obraId || (saidas.find(s => s.id === id)?.obraId);
      if (obraId) {
        setTimeout(() => updateProjectBalance(obraId), 200);
      }
      showToast('Saída financeira atualizada com sucesso!', 'success');
    } catch (err: any) {
      showToast('Erro ao atualizar saída: ' + err.message, 'error');
      throw err;
    }
  };

  const updateMaoObra = async (id: string, updatedFields: Partial<MaoObra>, originalRecord: MaoObra) => {
    try {
      await updateDoc(doc(db, 'maoObra', id), updatedFields);
      
      const nome = updatedFields.nome || originalRecord.nome;
      const funcao = updatedFields.funcao || originalRecord.funcao;

      // Find all matching outputs (saidas) that have this maoObraId to update their professional details
      const matchingSaidasQuery = query(collection(db, 'saidas'), where('maoObraId', '==', id));
      const matchingSaidasSnap = await getDocs(matchingSaidasQuery);
      for (const d of matchingSaidasSnap.docs) {
        await updateDoc(doc(db, 'saidas', d.id), {
          obraId: updatedFields.obraId || originalRecord.obraId,
          descricao: `Vale/Pgto: ${nome} (${funcao})`
        });
      }

      // Legacy support: update legacy matching outcome if exists
      const matchingSaida = saidas.find(s => 
        s.obraId === originalRecord.obraId && 
        s.categoria === 'Mão de obra' &&
        !s.maoObraId &&
        s.valor === originalRecord.valor &&
        s.data === originalRecord.dataPagamento
      );
      if (matchingSaida) {
        const updatedSaida = {
          obraId: updatedFields.obraId || originalRecord.obraId,
          valor: updatedFields.valor !== undefined ? updatedFields.valor : originalRecord.valor,
          data: updatedFields.dataPagamento || originalRecord.dataPagamento,
          categoria: 'Mão de obra' as const,
          descricao: `Mão de obra: ${nome} (${funcao})`,
          observacao: updatedFields.observacao !== undefined ? updatedFields.observacao : originalRecord.observacao || ''
        };
        await updateDoc(doc(db, 'saidas', matchingSaida.id), updatedSaida);
      }
      
      const finalObraId = updatedFields.obraId || originalRecord.obraId;
      setTimeout(() => updateProjectBalance(finalObraId), 200);
      showToast(`Cadastro do profissional ${nome} atualizado com sucesso!`, 'success');
    } catch (err: any) {
      showToast('Erro ao atualizar profissional: ' + err.message, 'error');
      throw err;
    }
  };

  const addMaoObraVale = async (maoObraId: string, vale: Omit<PagamentoMaoObra, 'id'>) => {
    try {
      const professionalRef = doc(db, 'maoObra', maoObraId);
      const professionalSnap = await getDoc(professionalRef);
      if (!professionalSnap.exists()) return;
      const profData = professionalSnap.data() as MaoObra;
      
      const paymentId = 'vale_' + Math.random().toString(36).substr(2, 9);
      const newVale: PagamentoMaoObra = {
        ...vale,
        id: paymentId
      };
      
      const currentPagamentos = profData.pagamentos || [];
      const updatedPagamentos = [...currentPagamentos, newVale];
      const newTotalPaid = updatedPagamentos.reduce((sum, p) => sum + Number(p.valor), 0);
      
      await updateDoc(professionalRef, {
        pagamentos: updatedPagamentos,
        valor: newTotalPaid
      });
      
      const saidaRecord = {
        obraId: profData.obraId,
        valor: vale.valor,
        data: vale.data,
        categoria: 'Mão de obra' as const,
        descricao: `Vale/Pgto: ${profData.nome} (${profData.funcao})`,
        observacao: vale.observacao || '',
        maoObraId: maoObraId,
        paymentId: paymentId
      };
      await addDoc(collection(db, 'saidas'), saidaRecord);
      
      setTimeout(() => updateProjectBalance(profData.obraId), 200);
      showToast('Vale registrado com sucesso!', 'success');
    } catch (err: any) {
      showToast('Erro ao registrar vale: ' + err.message, 'error');
      throw err;
    }
  };

  const deleteMaoObraVale = async (maoObraId: string, paymentId: string) => {
    try {
      const professionalRef = doc(db, 'maoObra', maoObraId);
      const professionalSnap = await getDoc(professionalRef);
      if (!professionalSnap.exists()) return;
      const profData = professionalSnap.data() as MaoObra;
      
      const currentPagamentos = profData.pagamentos || [];
      const updatedPagamentos = currentPagamentos.filter(p => p.id !== paymentId);
      const newTotalPaid = updatedPagamentos.reduce((sum, p) => sum + Number(p.valor), 0);
      
      await updateDoc(professionalRef, {
        pagamentos: updatedPagamentos,
        valor: newTotalPaid
      });
      
      const matchingSaidasQuery = query(
        collection(db, 'saidas'), 
        where('maoObraId', '==', maoObraId),
        where('paymentId', '==', paymentId)
      );
      const matchingSaidasSnap = await getDocs(matchingSaidasQuery);
      for (const d of matchingSaidasSnap.docs) {
        await deleteDoc(doc(db, 'saidas', d.id));
      }
      
      setTimeout(() => updateProjectBalance(profData.obraId), 200);
      showToast('Vale excluído com sucesso!', 'success');
    } catch (err: any) {
      showToast('Erro ao excluir vale: ' + err.message, 'error');
      throw err;
    }
  };

  const updateMaoObraVale = async (maoObraId: string, paymentId: string, updatedFields: Partial<PagamentoMaoObra>) => {
    try {
      const professionalRef = doc(db, 'maoObra', maoObraId);
      const professionalSnap = await getDoc(professionalRef);
      if (!professionalSnap.exists()) return;
      const profData = professionalSnap.data() as MaoObra;
      
      const currentPagamentos = profData.pagamentos || [];
      const updatedPagamentos = currentPagamentos.map(p => {
        if (p.id === paymentId) {
          return { ...p, ...updatedFields };
        }
        return p;
      });
      const newTotalPaid = updatedPagamentos.reduce((sum, p) => sum + Number(p.valor), 0);
      
      await updateDoc(professionalRef, {
        pagamentos: updatedPagamentos,
        valor: newTotalPaid
      });
      
      const matchingSaidasQuery = query(
        collection(db, 'saidas'), 
        where('maoObraId', '==', maoObraId),
        where('paymentId', '==', paymentId)
      );
      const matchingSaidasSnap = await getDocs(matchingSaidasQuery);
      for (const d of matchingSaidasSnap.docs) {
        await updateDoc(doc(db, 'saidas', d.id), {
          valor: updatedFields.valor !== undefined ? updatedFields.valor : d.data().valor,
          data: updatedFields.data || d.data().data,
          observacao: updatedFields.observacao !== undefined ? updatedFields.observacao : d.data().observacao || ''
        });
      }
      
      setTimeout(() => updateProjectBalance(profData.obraId), 200);
      showToast('Vale atualizado com sucesso!', 'success');
    } catch (err: any) {
      showToast('Erro ao atualizar vale: ' + err.message, 'error');
      throw err;
    }
  };

  const updateMaterial = async (id: string, updatedFields: Partial<Material>, originalRecord: Material) => {
    try {
      await updateDoc(doc(db, 'materiais', id), updatedFields);
      
      // Find matching output (saida) to update
      const matchingSaida = saidas.find(s => 
        s.obraId === originalRecord.obraId && 
        s.categoria === 'Material' &&
        s.valor === originalRecord.valorTotal &&
        s.data === originalRecord.dataCompra
      );
      if (matchingSaida) {
        const updatedSaida = {
          obraId: updatedFields.obraId || originalRecord.obraId,
          valor: updatedFields.valorTotal !== undefined ? updatedFields.valorTotal : originalRecord.valorTotal,
          data: updatedFields.dataCompra || originalRecord.dataCompra,
          categoria: 'Material' as const,
          descricao: `Material: ${updatedFields.nome || originalRecord.nome} (${updatedFields.quantidade !== undefined ? updatedFields.quantidade : originalRecord.quantidade} ${updatedFields.unidade || originalRecord.unidade})`,
          observacao: updatedFields.observacao !== undefined ? updatedFields.observacao : originalRecord.observacao || ''
        };
        await updateDoc(doc(db, 'saidas', matchingSaida.id), updatedSaida);
      }
      
      // Find matching price comparison to update
      const matchingComp = comparacoes.find(c => 
        c.material === originalRecord.nome && 
        c.loja === originalRecord.loja && 
        c.valor === originalRecord.valorUnitario &&
        c.data === originalRecord.dataCompra
      );
      if (matchingComp) {
        const updatedComp = {
          material: updatedFields.nome || originalRecord.nome,
          loja: updatedFields.loja || originalRecord.loja,
          valor: updatedFields.valorUnitario !== undefined ? updatedFields.valorUnitario : originalRecord.valorUnitario,
          data: updatedFields.dataCompra || originalRecord.dataCompra
        };
        await updateDoc(doc(db, 'comparacaoPrecos', matchingComp.id), updatedComp);
      }

      const finalObraId = updatedFields.obraId || originalRecord.obraId;
      setTimeout(() => updateProjectBalance(finalObraId), 200);
      showToast('Material atualizado com sucesso!', 'success');
    } catch (err: any) {
      showToast('Erro ao atualizar material: ' + err.message, 'error');
      throw err;
    }
  };

  const addComparacao = async (comp: Omit<ComparacaoPreco, 'id' | 'usuarioId'>) => {
    if (!userId) return;
    try {
      const docRef = await addDoc(collection(db, 'comparacaoPrecos'), {
        ...comp,
        usuarioId: userId
      });
      showToast('Preço adicionado ao comparador com sucesso!', 'success');
      return docRef;
    } catch (err: any) {
      showToast('Erro ao adicionar preço: ' + err.message, 'error');
      throw err;
    }
  };

  const deleteComparacao = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'comparacaoPrecos', id));
      showToast('Preço removido com sucesso!', 'success');
    } catch (err: any) {
      showToast('Erro ao remover preço: ' + err.message, 'error');
      throw err;
    }
  };

  // Bootstrap custom initial sample data if a new user has no projects
  const bootstrapSampleProject = async () => {
    if (!userId) return;
    const projectRef = await addObra({
      nome: 'Residência Jardins',
      cliente: 'Mariana de Souza',
      endereco: 'Av. Paulista, 1500 - São Paulo SP',
      saldoInicial: 150000,
      dataInicio: '2026-06-01',
      dataTermino: '2026-12-15',
      observacoes: 'Construção de sobrado residencial de 180m².'
    });

    if (projectRef) {
      const oId = projectRef.id;
      // Add Entries
      await addDoc(collection(db, 'entradas'), {
        obraId: oId,
        valor: 50000,
        data: '2026-06-02',
        origem: 'Cliente - 1ª Parcela',
        descricao: 'Aporte de recursos inicial da proprietária.'
      });

      // Add Materials
      const materials = [
        {
          obraId: oId,
          categoria: 'Cimento',
          nome: 'Cimento CP II 50kg Votoran',
          quantidade: 50,
          unidade: 'saco',
          valorUnitario: 39.50,
          valorTotal: 1975.00,
          loja: 'Loja Sol Materiais',
          dataCompra: '2026-06-05',
          notaFiscal: '1024'
        },
        {
          obraId: oId,
          categoria: 'Ferro',
          nome: 'Vergalhão CA-50 10mm 3/8 Gerdau',
          quantidade: 30,
          unidade: 'barra',
          valorUnitario: 62.90,
          valorTotal: 1887.00,
          loja: 'Depósito Construforte',
          dataCompra: '2026-06-10',
          notaFiscal: '1098'
        }
      ];

      for (const mat of materials) {
        await addDoc(collection(db, 'materiais'), mat);
        // Add to Comparador de Preços too
        await addDoc(collection(db, 'comparacaoPrecos'), {
          usuarioId: userId,
          material: mat.nome,
          loja: mat.loja,
          valor: mat.valorUnitario,
          data: mat.dataCompra
        });
        // Create corresponding outcome
        await addDoc(collection(db, 'saidas'), {
          obraId: oId,
          valor: mat.valorTotal,
          data: mat.dataCompra,
          categoria: 'Material',
          descricao: `Material: ${mat.nome} (${mat.quantidade} ${mat.unidade})`,
          observacao: ''
        });
      }

      // Add Labor (MaoObra)
      const labor = [
        {
          obraId: oId,
          nome: 'José Silva',
          funcao: 'Pedreiro',
          valor: 1300,
          dataPagamento: '2026-06-12',
          formaPagamento: 'Pix',
          cpf: '123.456.789-00',
          telefone: '(11) 98765-4321',
          observacao: 'Pagamento quinzenal de alvenaria estrutural.'
        },
        {
          obraId: oId,
          nome: 'Lucas Mendes',
          funcao: 'Servente',
          valor: 750,
          dataPagamento: '2026-06-12',
          formaPagamento: 'Pix',
          cpf: '223.456.789-11',
          telefone: '(11) 98765-4322',
          observacao: 'Pagamento quinzenal de apoio na mistura de argamassa.'
        }
      ];

      for (const lab of labor) {
        await addDoc(collection(db, 'maoObra'), lab);
        await addDoc(collection(db, 'saidas'), {
          obraId: oId,
          valor: lab.valor,
          data: lab.dataPagamento,
          categoria: 'Mão de obra',
          descricao: `Mão de obra: ${lab.nome} (${lab.funcao})`,
          observacao: lab.observacao
        });
      }

      // Add other general outlays (saídas)
      await addDoc(collection(db, 'saidas'), {
        obraId: oId,
        valor: 450,
        data: '2026-06-03',
        categoria: 'Transporte',
        descricao: 'Frete de entrega de caçamba de entulho.',
        observacao: 'Caçamba LimpObra'
      });

      await addDoc(collection(db, 'saidas'), {
        obraId: oId,
        valor: 280,
        data: '2026-06-04',
        categoria: 'Alimentação',
        descricao: 'Almoço de inauguração com equipe de pedreiros.',
        observacao: 'Churrascaria Boi Bravo'
      });

      // Insert other stores for price comparison demo
      const otherPrices = [
        { usuarioId: userId, material: 'Cimento CP II 50kg Votoran', loja: 'Loja Ferragens Norte', valor: 42.90, data: '2026-06-05' },
        { usuarioId: userId, material: 'Cimento CP II 50kg Votoran', loja: 'Depósito Alvorada', valor: 38.00, data: '2026-06-06' },
        { usuarioId: userId, material: 'Vergalhão CA-50 10mm 3/8 Gerdau', loja: 'Loja Sol Materiais', valor: 65.50, data: '2026-06-10' },
        { usuarioId: userId, material: 'Vergalhão CA-50 10mm 3/8 Gerdau', loja: 'Tudo de Aço Ltda', valor: 59.90, data: '2026-06-11' }
      ];

      for (const op of otherPrices) {
        await addDoc(collection(db, 'comparacaoPrecos'), op);
      }

      // Re-trigger final balance calculations
      // Total available: 150000 + 50000 - 1975 - 1887 - 1300 - 750 - 450 - 280 = 193358
      await updateDoc(doc(db, 'obras', oId), { saldoAtual: 193358 });
      setSelectedObraId(oId);
    }
  };

  return {
    obras,
    selectedObraId,
    setSelectedObraId,
    entradas,
    saidas,
    maoObra,
    materiais,
    comparacoes,
    loading,
    addObra,
    updateObra,
    deleteObra,
    addEntrada,
    updateEntrada,
    deleteEntrada,
    addSaida,
    updateSaida,
    deleteSaida,
    addMaoObra,
    updateMaoObra,
    deleteMaoObra,
    addMaoObraVale,
    deleteMaoObraVale,
    updateMaoObraVale,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    addComparacao,
    deleteComparacao,
    bootstrapSampleProject,
    recalculateAll: () => selectedObraId && updateProjectBalance(selectedObraId)
  };
}
