"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  collection,
  query,
  getDocs,
  orderBy,
  where,
  limit,
  startAfter,
  DocumentData,
  QueryConstraint,
  getCountFromServer,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/config";

interface UseAdminDataOptions<T> {
  collectionName: string;
  orderByField?: string;
  orderDirection?: "asc" | "desc";
  pageSize?: number;
  whereConditions?: { field: string; op: "==" | "!=" | ">" | "<" | ">=" | "<="; value: unknown }[];
  transform?: (doc: DocumentData, id: string) => T;
}

interface UseAdminDataReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  refresh: () => void;
}

/**
 * Generic hook for fetching paginated admin data from Firestore
 */
export function useAdminData<T = DocumentData>(
  options: UseAdminDataOptions<T>
): UseAdminDataReturn<T> {
  const {
    collectionName,
    orderByField = "createdAt",
    orderDirection = "desc",
    pageSize: initialPageSize = 10,
    whereConditions = [],
    transform = (doc, id) => ({ id, ...doc } as T),
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [cursors, setCursors] = useState<DocumentData[]>([]);

  const totalPages = useMemo(() => Math.ceil(totalCount / pageSize) || 1, [totalCount, pageSize]);

  const fetchCount = useCallback(async () => {
    try {
      const db = getDb();
      const constraints: QueryConstraint[] = [];
      
      whereConditions.forEach(({ field, op, value }) => {
        constraints.push(where(field, op, value));
      });

      const countQuery = query(collection(db, collectionName), ...constraints);
      const snapshot = await getCountFromServer(countQuery);
      setTotalCount(snapshot.data().count);
    } catch (err) {
      console.error("Error fetching count:", err);
    }
  }, [collectionName, whereConditions]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const db = getDb();
      const constraints: QueryConstraint[] = [];

      // Add where conditions
      whereConditions.forEach(({ field, op, value }) => {
        constraints.push(where(field, op, value));
      });

      // Add ordering
      constraints.push(orderBy(orderByField, orderDirection));

      // Add pagination
      if (currentPage > 1 && cursors[currentPage - 2]) {
        constraints.push(startAfter(cursors[currentPage - 2]));
      }

      constraints.push(limit(pageSize));

      const q = query(collection(db, collectionName), ...constraints);
      const snapshot = await getDocs(q);

      const items = snapshot.docs.map((doc) => transform(doc.data(), doc.id));
      setData(items);

      // Store cursor for next page
      if (snapshot.docs.length > 0) {
        const lastDoc = snapshot.docs[snapshot.docs.length - 1];
        setCursors((prev) => {
          const newCursors = [...prev];
          newCursors[currentPage - 1] = lastDoc;
          return newCursors;
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch data";
      setError(message);
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [collectionName, orderByField, orderDirection, pageSize, currentPage, whereConditions, transform, cursors]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  useEffect(() => {
    fetchData();
  }, [currentPage, pageSize]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage((p) => p + 1);
    }
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
    }
  }, [currentPage]);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const refresh = useCallback(() => {
    setCursors([]);
    setCurrentPage(1);
    fetchCount();
    fetchData();
  }, [fetchCount, fetchData]);

  return {
    data,
    loading,
    error,
    totalCount,
    currentPage,
    totalPages,
    pageSize,
    setPageSize: (size: number) => {
      setPageSize(size);
      setCurrentPage(1);
      setCursors([]);
    },
    nextPage,
    prevPage,
    goToPage,
    refresh,
  };
}

/**
 * Hook for simple data fetching without pagination
 */
export function useAdminDataSimple<T = DocumentData>(
  collectionName: string,
  transform?: (doc: DocumentData, id: string) => T
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const db = getDb();
      const q = query(collection(db, collectionName));
      const snapshot = await getDocs(q);

      const items = snapshot.docs.map((doc) => {
        if (transform) {
          return transform(doc.data(), doc.id);
        }
        return { id: doc.id, ...doc.data() } as T;
      });

      setData(items);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch data";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [collectionName, transform]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
