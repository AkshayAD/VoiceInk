/**
 * Advanced Search Service (Step 128)
 * Full-text search, semantic search, faceted filtering, and intelligent ranking
 */

import { EventEmitter } from 'events'
import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'

export interface SearchConfig {
  enabled: boolean
  engines: SearchEngine[]
  indexing: IndexingConfig
  ranking: RankingConfig
  suggestions: SuggestionsConfig
  analytics: SearchAnalyticsConfig
  performance: PerformanceConfig
  facets: FacetConfig
  semantic: SemanticConfig
  security: SearchSecurityConfig
}

export interface SearchEngine {
  id: string
  name: string
  type: 'fulltext' | 'semantic' | 'hybrid' | 'faceted' | 'fuzzy'
  enabled: boolean
  priority: number
  config: EngineConfig
  fields: SearchField[]
  filters: SearchFilter[]
  boost: BoostConfig
}

export interface EngineConfig {
  analyzer: string
  tokenizer: string
  stemming: boolean
  stopWords: string[]
  synonyms: SynonymConfig
  nGrams: NGramConfig
  phonetic: PhoneticConfig
  proximity: ProximityConfig
}

export interface SynonymConfig {
  enabled: boolean
  expansion: 'query' | 'index' | 'both'
  synonyms: { [term: string]: string[] }
  contextual: boolean
  weight: number
}

export interface NGramConfig {
  enabled: boolean
  minGram: number
  maxGram: number
  preserveOriginal: boolean
  side: 'front' | 'back' | 'both'
}

export interface PhoneticConfig {
  enabled: boolean
  algorithm: 'soundex' | 'metaphone' | 'doubleMetaphone' | 'nysiis'
  replace: boolean
  maxCodeLength: number
}

export interface ProximityConfig {
  enabled: boolean
  slop: number // word distance tolerance
  inOrder: boolean
  boost: number
}

export interface SearchField {
  name: string
  type: 'text' | 'keyword' | 'numeric' | 'date' | 'boolean' | 'geo' | 'nested'
  indexed: boolean
  stored: boolean
  analyzed: boolean
  boost: number
  facetable: boolean
  suggestible: boolean
  highlighting: boolean
  similarity: SimilarityConfig
}

export interface SimilarityConfig {
  algorithm: 'BM25' | 'TF-IDF' | 'DFR' | 'IB' | 'LMDirichlet' | 'LMJelinekMercer'
  parameters: { [key: string]: number }
}

export interface SearchFilter {
  id: string
  name: string
  field: string
  type: 'term' | 'range' | 'prefix' | 'wildcard' | 'regexp' | 'fuzzy' | 'geo'
  enabled: boolean
  weight: number
  config: FilterConfig
}

export interface FilterConfig {
  caseSensitive?: boolean
  maxExpansions?: number
  prefixLength?: number
  fuzziness?: string | number
  maxDistance?: string
  center?: GeoPoint
  distance?: string
}

export interface GeoPoint {
  lat: number
  lon: number
}

export interface BoostConfig {
  recency: RecencyBoost
  popularity: PopularityBoost
  relevance: RelevanceBoost
  custom: CustomBoost[]
}

export interface RecencyBoost {
  enabled: boolean
  field: string
  scale: string // '1d', '7d', '30d'
  decay: number
  offset: string
}

export interface PopularityBoost {
  enabled: boolean
  field: string
  modifier: 'log' | 'log1p' | 'log2p' | 'ln' | 'ln1p' | 'ln2p' | 'square' | 'sqrt' | 'reciprocal'
  factor: number
  missing: number
}

export interface RelevanceBoost {
  enabled: boolean
  titleBoost: number
  contentBoost: number
  tagsBoost: number
  exactMatchBoost: number
  phraseBoost: number
}

export interface CustomBoost {
  id: string
  name: string
  field: string
  function: 'field_value_factor' | 'script_score' | 'random_score' | 'decay'
  parameters: any
  weight: number
}

export interface IndexingConfig {
  enabled: boolean
  mode: 'realtime' | 'batch' | 'hybrid'
  batchSize: number
  refreshInterval: string // '1s', '30s', '1m'
  shards: number
  replicas: number
  compression: boolean
  optimization: OptimizationConfig
  lifecycle: LifecycleConfig
}

export interface OptimizationConfig {
  enabled: boolean
  frequency: 'hourly' | 'daily' | 'weekly'
  maxSegments: number
  expungeDeletes: boolean
  forceMerge: boolean
}

export interface LifecycleConfig {
  enabled: boolean
  phases: LifecyclePhase[]
  rollover: RolloverConfig
}

export interface LifecyclePhase {
  name: 'hot' | 'warm' | 'cold' | 'delete'
  minAge: string
  actions: LifecycleAction[]
}

export interface LifecycleAction {
  type: 'allocate' | 'delete' | 'forcemerge' | 'readonly' | 'shrink'
  config: any
}

export interface RolloverConfig {
  enabled: boolean
  maxSize: string
  maxAge: string
  maxDocs: number
}

export interface RankingConfig {
  enabled: boolean
  algorithm: 'default' | 'learning_to_rank' | 'custom'
  features: RankingFeature[]
  models: RankingModel[]
  personalization: PersonalizationConfig
  diversification: DiversificationConfig
}

export interface RankingFeature {
  name: string
  type: 'text' | 'numeric' | 'categorical' | 'interaction'
  weight: number
  normalization: 'none' | 'min_max' | 'z_score' | 'sigmoid'
  extraction: FeatureExtraction
}

export interface FeatureExtraction {
  method: 'tf_idf' | 'bm25' | 'field_value' | 'script' | 'query_dependent'
  parameters: any
}

export interface RankingModel {
  id: string
  name: string
  type: 'linear' | 'tree' | 'neural' | 'svm' | 'ensemble'
  trained: boolean
  accuracy: number
  features: string[]
  parameters: any
  lastTrained: Date
}

export interface PersonalizationConfig {
  enabled: boolean
  userFeatures: string[]
  contextFeatures: string[]
  sessionWeight: number
  historyWeight: number
  realtimeUpdate: boolean
}

export interface DiversificationConfig {
  enabled: boolean
  algorithm: 'mmr' | 'diversified_top_k' | 'xQuAD'
  lambda: number // trade-off between relevance and diversity
  windowSize: number
  maxDuplicates: number
}

export interface SuggestionsConfig {
  enabled: boolean
  types: SuggestionType[]
  completion: CompletionConfig
  spelling: SpellingConfig
  autocomplete: AutocompleteConfig
  related: RelatedSuggestionsConfig
}

export interface SuggestionType {
  name: 'completion' | 'spelling' | 'phrase' | 'category' | 'entity'
  enabled: boolean
  priority: number
  source: string
  maxSuggestions: number
}

export interface CompletionConfig {
  enabled: boolean
  field: string
  size: number
  prefix: boolean
  fuzzy: boolean
  contexts: CompletionContext[]
  skipDuplicates: boolean
}

export interface CompletionContext {
  name: string
  type: 'category' | 'geo' | 'tag'
  path: string
  precision: number
}

export interface SpellingConfig {
  enabled: boolean
  field: string
  mode: 'suggest' | 'always' | 'missing'
  accuracy: number
  maxEdits: number
  maxInspections: number
  maxTermFreq: number
  prefixLength: number
  minWordLength: number
  minDocFreq: number
}

export interface AutocompleteConfig {
  enabled: boolean
  sources: AutocompleteSource[]
  caching: boolean
  maxResults: number
  minQueryLength: number
  debounceMs: number
}

export interface AutocompleteSource {
  name: string
  type: 'history' | 'popular' | 'suggestions' | 'entities'
  weight: number
  maxAge: string
  boost: number
}

export interface RelatedSuggestionsConfig {
  enabled: boolean
  algorithm: 'mlt' | 'collaborative' | 'content_based' | 'hybrid'
  minTermFreq: number
  maxQueryTerms: number
  minDocFreq: number
  maxDocFreq: number
  minWordLength: number
  maxWordLength: number
  stopWords: string[]
}

export interface SearchAnalyticsConfig {
  enabled: boolean
  tracking: TrackingConfig
  metrics: AnalyticsMetric[]
  reports: AnalyticsReport[]
  alerts: AnalyticsAlert[]
  retention: number // days
}

export interface TrackingConfig {
  enabled: boolean
  events: string[]
  sessionTracking: boolean
  userTracking: boolean
  anonymization: boolean
  sampling: number // 0-1
}

export interface AnalyticsMetric {
  name: string
  type: 'counter' | 'histogram' | 'gauge' | 'rate'
  dimensions: string[]
  aggregation: 'sum' | 'avg' | 'max' | 'min' | 'count' | 'percentile'
  window: string // '1m', '1h', '1d'
}

export interface AnalyticsReport {
  id: string
  name: string
  type: 'queries' | 'performance' | 'popular' | 'failed' | 'trends'
  schedule: 'daily' | 'weekly' | 'monthly'
  recipients: string[]
  format: 'html' | 'pdf' | 'json' | 'csv'
}

export interface AnalyticsAlert {
  id: string
  name: string
  metric: string
  condition: string
  threshold: number
  duration: string
  channels: string[]
  enabled: boolean
}

export interface PerformanceConfig {
  enabled: boolean
  caching: CachingConfig
  optimization: SearchOptimization
  limits: SearchLimits
  monitoring: PerformanceMonitoring
}

export interface CachingConfig {
  enabled: boolean
  query: QueryCacheConfig
  filter: FilterCacheConfig
  fieldData: FieldDataCacheConfig
  request: RequestCacheConfig
}

export interface QueryCacheConfig {
  enabled: boolean
  size: string
  ttl: string
  maxSize: number
}

export interface FilterCacheConfig {
  enabled: boolean
  size: string
  maxSize: number
}

export interface FieldDataCacheConfig {
  enabled: boolean
  size: string
  maxSize: number
}

export interface RequestCacheConfig {
  enabled: boolean
  size: string
  ttl: string
  enable: string[]
}

export interface SearchOptimization {
  enabled: boolean
  preferences: string[]
  routing: string
  timeout: string
  batchedReduceSize: number
  maxConcurrentShardRequests: number
  preFilterShardSize: number
}

export interface SearchLimits {
  maxResults: number
  maxOffset: number
  maxTerms: number
  maxClauses: number
  maxFacets: number
  timeout: string
}

export interface PerformanceMonitoring {
  enabled: boolean
  slowQueryThreshold: number // ms
  logging: boolean
  profiling: boolean
  sampling: number // 0-1
}

export interface FacetConfig {
  enabled: boolean
  facets: FacetDefinition[]
  aggregations: AggregationConfig
  hierarchical: HierarchicalConfig
  dynamic: DynamicFacetsConfig
}

export interface FacetDefinition {
  name: string
  field: string
  type: 'terms' | 'range' | 'histogram' | 'date_histogram' | 'geo_distance'
  size: number
  minDocCount: number
  missing: string
  order: FacetOrder
  include: string[]
  exclude: string[]
}

export interface FacetOrder {
  type: '_count' | '_key' | '_term'
  direction: 'asc' | 'desc'
}

export interface AggregationConfig {
  enabled: boolean
  maxBuckets: number
  shardSize: number
  showTermDocCountError: boolean
  collectMode: 'depth_first' | 'breadth_first'
}

export interface HierarchicalConfig {
  enabled: boolean
  separator: string
  maxLevels: number
  showEmptyLevels: boolean
}

export interface DynamicFacetsConfig {
  enabled: boolean
  maxFacets: number
  minDocCount: number
  fields: string[]
  excludeFields: string[]
}

export interface SemanticConfig {
  enabled: boolean
  models: SemanticModel[]
  embeddings: EmbeddingConfig
  similarity: SemanticSimilarity
  clustering: ClusteringConfig
  expansion: QueryExpansion
}

export interface SemanticModel {
  id: string
  name: string
  type: 'word2vec' | 'fasttext' | 'glove' | 'bert' | 'roberta' | 'gpt' | 'custom'
  language: string
  dimensions: number
  vocabulary: number
  trained: boolean
  path: string
  endpoint?: string
  accuracy: number
}

export interface EmbeddingConfig {
  enabled: boolean
  field: string
  model: string
  dimensions: number
  similarity: 'cosine' | 'dot_product' | 'l2_norm'
  indexing: EmbeddingIndexing
}

export interface EmbeddingIndexing {
  method: 'hnsw' | 'ivf' | 'lsh' | 'annoy'
  parameters: any
  buildTime: 'index' | 'search'
  precision: number
}

export interface SemanticSimilarity {
  enabled: boolean
  threshold: number
  algorithm: 'cosine' | 'jaccard' | 'euclidean' | 'manhattan'
  normalization: boolean
  boost: number
}

export interface ClusteringConfig {
  enabled: boolean
  algorithm: 'kmeans' | 'hierarchical' | 'dbscan' | 'spectral'
  clusters: number
  features: string[]
  dynamicClusters: boolean
}

export interface QueryExpansion {
  enabled: boolean
  method: 'thesaurus' | 'word_embeddings' | 'co_occurrence' | 'pseudo_relevance'
  maxTerms: number
  minScore: number
  boost: number
}

export interface SearchSecurityConfig {
  enabled: boolean
  authentication: SearchAuthentication
  authorization: SearchAuthorization
  filtering: SecurityFiltering
  auditing: SearchAuditing
}

export interface SearchAuthentication {
  required: boolean
  methods: string[]
  apiKey: boolean
  token: boolean
  session: boolean
}

export interface SearchAuthorization {
  enabled: boolean
  fieldLevel: boolean
  documentLevel: boolean
  roles: SearchRole[]
  policies: SearchPolicy[]
}

export interface SearchRole {
  name: string
  permissions: string[]
  fields: string[]
  filters: string[]
  indices: string[]
}

export interface SearchPolicy {
  id: string
  name: string
  rules: PolicyRule[]
  effect: 'allow' | 'deny'
  priority: number
}

export interface PolicyRule {
  resource: string
  action: string
  condition?: string
  effect: 'allow' | 'deny'
}

export interface SecurityFiltering {
  enabled: boolean
  userContext: boolean
  roleFilters: boolean
  fieldMasking: boolean
  documentFiltering: boolean
}

export interface SearchAuditing {
  enabled: boolean
  events: string[]
  retention: number // days
  storage: 'local' | 'remote' | 'siem'
  format: 'json' | 'syslog' | 'cef'
}

export interface SearchQuery {
  id: string
  text: string
  filters: QueryFilter[]
  facets: string[]
  sort: SortCriteria[]
  pagination: Pagination
  highlighting: HighlightingConfig
  suggestions: boolean
  explain: boolean
  profile: boolean
  timeout?: number
  preference?: string
  routing?: string
  searchType?: 'query_then_fetch' | 'dfs_query_then_fetch'
}

export interface QueryFilter {
  field: string
  type: 'term' | 'terms' | 'range' | 'exists' | 'prefix' | 'wildcard' | 'regexp'
  value: any
  operator?: 'and' | 'or' | 'not'
  boost?: number
}

export interface SortCriteria {
  field: string
  order: 'asc' | 'desc'
  mode?: 'min' | 'max' | 'sum' | 'avg' | 'median'
  missing?: '_first' | '_last' | string
  unmappedType?: string
}

export interface Pagination {
  from: number
  size: number
  searchAfter?: any[]
  scrollId?: string
  scrollSize?: number
  scrollTime?: string
}

export interface HighlightingConfig {
  enabled: boolean
  fields: string[]
  fragmentSize: number
  numberOfFragments: number
  fragmentOffset: number
  encoder: 'default' | 'html'
  tagSchema: 'styled' | 'default'
  preTags: string[]
  postTags: string[]
  requireFieldMatch: boolean
}

export interface SearchResult {
  id: string
  queryId: string
  totalHits: number
  maxScore: number
  took: number // milliseconds
  timedOut: boolean
  hits: SearchHit[]
  aggregations: SearchAggregations
  suggest: SearchSuggestions
  profile?: QueryProfile
  explanation?: QueryExplanation
}

export interface SearchHit {
  id: string
  index: string
  score: number
  source: any
  highlight?: { [field: string]: string[] }
  sort?: any[]
  explanation?: HitExplanation
  matchedQueries?: string[]
  innerHits?: { [name: string]: SearchResult }
}

export interface SearchAggregations {
  [name: string]: SearchAggregation
}

export interface SearchAggregation {
  buckets?: AggregationBucket[]
  value?: number
  values?: { [key: string]: number }
  docCount?: number
  docCountErrorUpperBound?: number
  sumOtherDocCount?: number
}

export interface AggregationBucket {
  key: any
  docCount: number
  keyAsString?: string
  aggregations?: SearchAggregations
}

export interface SearchSuggestions {
  [name: string]: SuggestionResponse[]
}

export interface SuggestionResponse {
  text: string
  offset: number
  length: number
  options: SuggestionOption[]
}

export interface SuggestionOption {
  text: string
  score: number
  freq?: number
  highlighted?: string
  payload?: any
  contexts?: { [name: string]: string[] }
}

export interface QueryProfile {
  shards: ShardProfile[]
  collector: CollectorProfile[]
  rewriteTime: number
}

export interface ShardProfile {
  id: string
  searches: SearchProfile[]
  aggregations: AggregationProfile[]
}

export interface SearchProfile {
  query: QueryTypeProfile[]
  rewriteTime: number
  collector: CollectorProfile[]
}

export interface QueryTypeProfile {
  type: string
  description: string
  time: number
  timeInNanos: number
  breakdown: { [key: string]: number }
  children?: QueryTypeProfile[]
}

export interface AggregationProfile {
  type: string
  description: string
  time: number
  timeInNanos: number
  breakdown: { [key: string]: number }
  children?: AggregationProfile[]
}

export interface CollectorProfile {
  name: string
  reason: string
  time: number
  timeInNanos: number
  children?: CollectorProfile[]
}

export interface QueryExplanation {
  value: number
  description: string
  details: QueryExplanation[]
}

export interface HitExplanation {
  value: number
  description: string
  details: HitExplanation[]
}

export interface SearchDocument {
  id: string
  index: string
  type: string
  source: any
  timestamp: Date
  version: number
  routing?: string
  parent?: string
  metadata: DocumentMetadata
}

export interface DocumentMetadata {
  boost?: number
  ttl?: number
  refresh?: boolean
  timeout?: string
  pipeline?: string
  ifSeqNo?: number
  ifPrimaryTerm?: number
}

export interface IndexStats {
  name: string
  health: 'green' | 'yellow' | 'red'
  status: 'open' | 'close'
  uuid: string
  primaryShards: number
  replicaShards: number
  totalShards: number
  documents: DocumentStats
  storage: StorageStats
  performance: IndexPerformance
}

export interface DocumentStats {
  count: number
  deleted: number
  size: number
}

export interface StorageStats {
  total: number
  primarySize: number
  replicaSize: number
  compressed: number
}

export interface IndexPerformance {
  indexing: PerformanceMetrics
  search: PerformanceMetrics
  get: PerformanceMetrics
  merge: PerformanceMetrics
  refresh: PerformanceMetrics
  flush: PerformanceMetrics
}

export interface PerformanceMetrics {
  total: number
  time: number
  current: number
  failed: number
  rate: number
  avgTime: number
}

export interface SearchAnalytics {
  queries: QueryAnalytics
  performance: PerformanceAnalytics
  popularity: PopularityAnalytics
  users: UserAnalytics
  trends: TrendAnalytics
}

export interface QueryAnalytics {
  total: number
  successful: number
  failed: number
  avgResponseTime: number
  popularQueries: PopularQuery[]
  failedQueries: FailedQuery[]
  queryDistribution: QueryDistribution
}

export interface PopularQuery {
  query: string
  count: number
  avgScore: number
  clickThrough: number
  lastSeen: Date
}

export interface FailedQuery {
  query: string
  error: string
  count: number
  lastSeen: Date
}

export interface QueryDistribution {
  byLength: { [range: string]: number }
  byType: { [type: string]: number }
  byTime: { [hour: string]: number }
  byResults: { [range: string]: number }
}

export interface PerformanceAnalytics {
  avgResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  throughput: number
  errors: number
  timeouts: number
  slowQueries: SlowQuery[]
}

export interface SlowQuery {
  query: string
  responseTime: number
  timestamp: Date
  shardStats: any
}

export interface PopularityAnalytics {
  popularTerms: TermStats[]
  popularFilters: FilterStats[]
  popularFacets: FacetStats[]
  trendingQueries: TrendingQuery[]
}

export interface TermStats {
  term: string
  frequency: number
  trend: 'rising' | 'falling' | 'stable'
  categories: string[]
}

export interface FilterStats {
  filter: string
  usage: number
  selectivity: number
  performance: number
}

export interface FacetStats {
  facet: string
  usage: number
  distinctValues: number
  avgSelections: number
}

export interface TrendingQuery {
  query: string
  growth: number
  volume: number
  period: string
}

export interface UserAnalytics {
  totalUsers: number
  activeUsers: number
  avgQueriesPerUser: number
  userSegments: UserSegment[]
  sessionAnalytics: SessionAnalytics
}

export interface UserSegment {
  name: string
  size: number
  characteristics: any
  avgQueries: number
  avgSessionLength: number
}

export interface SessionAnalytics {
  avgSessionLength: number
  avgQueriesPerSession: number
  bounceRate: number
  conversionRate: number
  exitPages: string[]
}

export interface TrendAnalytics {
  queryVolume: TrendData[]
  responseTime: TrendData[]
  errorRate: TrendData[]
  userActivity: TrendData[]
  contentGrowth: TrendData[]
}

export interface TrendData {
  timestamp: Date
  value: number
  change: number
  period: 'hour' | 'day' | 'week' | 'month'
}

class AdvancedSearchService extends EventEmitter {
  private config: SearchConfig
  private indices: Map<string, SearchIndex> = new Map()
  private documents: Map<string, SearchDocument> = new Map()
  private queries: Map<string, SearchQuery> = new Map()
  private analytics: SearchAnalytics
  private invertedIndex: Map<string, Set<string>> = new Map()
  private embeddings: Map<string, number[]> = new Map()
  
  private configPath: string
  private dataPath: string
  private isInitialized = false
  private indexingInterval?: NodeJS.Timeout
  private analyticsInterval?: NodeJS.Timeout
  private optimizationInterval?: NodeJS.Timeout

  constructor() {
    super()
    const userDataPath = app.getPath('userData')
    this.configPath = path.join(userDataPath, 'search')
    this.dataPath = path.join(this.configPath, 'indices')
    
    this.config = this.getDefaultConfig()
    this.analytics = this.initializeAnalytics()
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.configPath, { recursive: true })
      await fs.mkdir(this.dataPath, { recursive: true })
      
      await this.loadConfiguration()
      await this.setupDefaultIndices()
      await this.loadExistingDocuments()
      await this.buildIndices()
      await this.startIndexingScheduler()
      await this.startAnalyticsCollection()
      await this.startOptimization()
      
      this.isInitialized = true
      this.emit('initialized')
      
      console.log('Advanced search service initialized successfully')
    } catch (error) {
      console.error('Failed to initialize advanced search service:', error)
      throw error
    }
  }

  private getDefaultConfig(): SearchConfig {
    return {
      enabled: true,
      engines: [{
        id: 'default-fulltext',
        name: 'Full-text Search',
        type: 'fulltext',
        enabled: true,
        priority: 1,
        config: {
          analyzer: 'standard',
          tokenizer: 'standard',
          stemming: true,
          stopWords: ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'],
          synonyms: {
            enabled: true,
            expansion: 'query',
            synonyms: {
              'quick': ['fast', 'rapid', 'speedy'],
              'big': ['large', 'huge', 'enormous'],
              'small': ['tiny', 'little', 'mini']
            },
            contextual: false,
            weight: 0.8
          },
          nGrams: {
            enabled: true,
            minGram: 2,
            maxGram: 3,
            preserveOriginal: true,
            side: 'front'
          },
          phonetic: {
            enabled: true,
            algorithm: 'soundex',
            replace: false,
            maxCodeLength: 4
          },
          proximity: {
            enabled: true,
            slop: 2,
            inOrder: false,
            boost: 1.2
          }
        },
        fields: [
          {
            name: 'title',
            type: 'text',
            indexed: true,
            stored: true,
            analyzed: true,
            boost: 2.0,
            facetable: false,
            suggestible: true,
            highlighting: true,
            similarity: {
              algorithm: 'BM25',
              parameters: { k1: 1.2, b: 0.75 }
            }
          },
          {
            name: 'content',
            type: 'text',
            indexed: true,
            stored: true,
            analyzed: true,
            boost: 1.0,
            facetable: false,
            suggestible: false,
            highlighting: true,
            similarity: {
              algorithm: 'BM25',
              parameters: { k1: 1.2, b: 0.75 }
            }
          },
          {
            name: 'tags',
            type: 'keyword',
            indexed: true,
            stored: true,
            analyzed: false,
            boost: 1.5,
            facetable: true,
            suggestible: true,
            highlighting: false,
            similarity: {
              algorithm: 'BM25',
              parameters: {}
            }
          },
          {
            name: 'timestamp',
            type: 'date',
            indexed: true,
            stored: true,
            analyzed: false,
            boost: 1.0,
            facetable: true,
            suggestible: false,
            highlighting: false,
            similarity: {
              algorithm: 'BM25',
              parameters: {}
            }
          }
        ],
        filters: [],
        boost: {
          recency: {
            enabled: true,
            field: 'timestamp',
            scale: '30d',
            decay: 0.5,
            offset: '7d'
          },
          popularity: {
            enabled: false,
            field: 'views',
            modifier: 'log1p',
            factor: 1.0,
            missing: 0
          },
          relevance: {
            enabled: true,
            titleBoost: 2.0,
            contentBoost: 1.0,
            tagsBoost: 1.5,
            exactMatchBoost: 3.0,
            phraseBoost: 2.0
          },
          custom: []
        }
      }],
      indexing: {
        enabled: true,
        mode: 'realtime',
        batchSize: 1000,
        refreshInterval: '1s',
        shards: 1,
        replicas: 0,
        compression: true,
        optimization: {
          enabled: true,
          frequency: 'daily',
          maxSegments: 1,
          expungeDeletes: true,
          forceMerge: true
        },
        lifecycle: {
          enabled: false,
          phases: [],
          rollover: {
            enabled: false,
            maxSize: '50GB',
            maxAge: '30d',
            maxDocs: 1000000
          }
        }
      },
      ranking: {
        enabled: true,
        algorithm: 'default',
        features: [
          {
            name: 'text_similarity',
            type: 'text',
            weight: 1.0,
            normalization: 'min_max',
            extraction: {
              method: 'bm25',
              parameters: {}
            }
          },
          {
            name: 'recency',
            type: 'numeric',
            weight: 0.5,
            normalization: 'sigmoid',
            extraction: {
              method: 'field_value',
              parameters: { field: 'timestamp' }
            }
          }
        ],
        models: [],
        personalization: {
          enabled: false,
          userFeatures: [],
          contextFeatures: [],
          sessionWeight: 0.3,
          historyWeight: 0.7,
          realtimeUpdate: true
        },
        diversification: {
          enabled: false,
          algorithm: 'mmr',
          lambda: 0.7,
          windowSize: 10,
          maxDuplicates: 2
        }
      },
      suggestions: {
        enabled: true,
        types: [
          { name: 'completion', enabled: true, priority: 1, source: 'title', maxSuggestions: 5 },
          { name: 'spelling', enabled: true, priority: 2, source: 'content', maxSuggestions: 3 }
        ],
        completion: {
          enabled: true,
          field: 'title',
          size: 10,
          prefix: true,
          fuzzy: true,
          contexts: [],
          skipDuplicates: true
        },
        spelling: {
          enabled: true,
          field: 'content',
          mode: 'suggest',
          accuracy: 0.75,
          maxEdits: 2,
          maxInspections: 5,
          maxTermFreq: 0.01,
          prefixLength: 1,
          minWordLength: 4,
          minDocFreq: 1
        },
        autocomplete: {
          enabled: true,
          sources: [
            { name: 'history', type: 'history', weight: 1.0, maxAge: '30d', boost: 1.0 },
            { name: 'popular', type: 'popular', weight: 0.8, maxAge: '7d', boost: 1.2 }
          ],
          caching: true,
          maxResults: 10,
          minQueryLength: 2,
          debounceMs: 300
        },
        related: {
          enabled: true,
          algorithm: 'mlt',
          minTermFreq: 2,
          maxQueryTerms: 25,
          minDocFreq: 5,
          maxDocFreq: 0.5,
          minWordLength: 3,
          maxWordLength: 25,
          stopWords: ['the', 'and', 'or', 'but']
        }
      },
      analytics: {
        enabled: true,
        tracking: {
          enabled: true,
          events: ['search', 'click', 'view', 'session'],
          sessionTracking: true,
          userTracking: false,
          anonymization: true,
          sampling: 1.0
        },
        metrics: [
          { name: 'search_total', type: 'counter', dimensions: ['query', 'user'], aggregation: 'sum', window: '1h' },
          { name: 'response_time', type: 'histogram', dimensions: ['index'], aggregation: 'percentile', window: '1m' }
        ],
        reports: [],
        alerts: [],
        retention: 90
      },
      performance: {
        enabled: true,
        caching: {
          enabled: true,
          query: {
            enabled: true,
            size: '100MB',
            ttl: '1h',
            maxSize: 1000
          },
          filter: {
            enabled: true,
            size: '50MB',
            maxSize: 500
          },
          fieldData: {
            enabled: true,
            size: '200MB',
            maxSize: 1000
          },
          request: {
            enabled: true,
            size: '10MB',
            ttl: '10m',
            enable: ['search', 'suggest']
          }
        },
        optimization: {
          enabled: true,
          preferences: ['_local'],
          routing: '_primary',
          timeout: '30s',
          batchedReduceSize: 512,
          maxConcurrentShardRequests: 5,
          preFilterShardSize: 128
        },
        limits: {
          maxResults: 10000,
          maxOffset: 10000,
          maxTerms: 65536,
          maxClauses: 1024,
          maxFacets: 100,
          timeout: '30s'
        },
        monitoring: {
          enabled: true,
          slowQueryThreshold: 1000,
          logging: true,
          profiling: false,
          sampling: 0.01
        }
      },
      facets: {
        enabled: true,
        facets: [
          {
            name: 'tags',
            field: 'tags',
            type: 'terms',
            size: 20,
            minDocCount: 1,
            missing: 'N/A',
            order: { type: '_count', direction: 'desc' },
            include: [],
            exclude: []
          }
        ],
        aggregations: {
          enabled: true,
          maxBuckets: 65536,
          shardSize: 0,
          showTermDocCountError: false,
          collectMode: 'depth_first'
        },
        hierarchical: {
          enabled: false,
          separator: '/',
          maxLevels: 5,
          showEmptyLevels: false
        },
        dynamic: {
          enabled: false,
          maxFacets: 10,
          minDocCount: 10,
          fields: [],
          excludeFields: []
        }
      },
      semantic: {
        enabled: false,
        models: [],
        embeddings: {
          enabled: false,
          field: 'content_vector',
          model: 'sentence-transformers',
          dimensions: 384,
          similarity: 'cosine',
          indexing: {
            method: 'hnsw',
            parameters: { m: 16, ef_construction: 200 },
            buildTime: 'index',
            precision: 0.95
          }
        },
        similarity: {
          enabled: false,
          threshold: 0.7,
          algorithm: 'cosine',
          normalization: true,
          boost: 1.0
        },
        clustering: {
          enabled: false,
          algorithm: 'kmeans',
          clusters: 10,
          features: ['content'],
          dynamicClusters: true
        },
        expansion: {
          enabled: false,
          method: 'word_embeddings',
          maxTerms: 5,
          minScore: 0.6,
          boost: 0.5
        }
      },
      security: {
        enabled: false,
        authentication: {
          required: false,
          methods: ['api_key'],
          apiKey: true,
          token: false,
          session: false
        },
        authorization: {
          enabled: false,
          fieldLevel: false,
          documentLevel: false,
          roles: [],
          policies: []
        },
        filtering: {
          enabled: false,
          userContext: false,
          roleFilters: false,
          fieldMasking: false,
          documentFiltering: false
        },
        auditing: {
          enabled: false,
          events: ['search', 'index', 'delete'],
          retention: 365,
          storage: 'local',
          format: 'json'
        }
      }
    }
  }

  private initializeAnalytics(): SearchAnalytics {
    return {
      queries: {
        total: 0,
        successful: 0,
        failed: 0,
        avgResponseTime: 0,
        popularQueries: [],
        failedQueries: [],
        queryDistribution: {
          byLength: {},
          byType: {},
          byTime: {},
          byResults: {}
        }
      },
      performance: {
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        throughput: 0,
        errors: 0,
        timeouts: 0,
        slowQueries: []
      },
      popularity: {
        popularTerms: [],
        popularFilters: [],
        popularFacets: [],
        trendingQueries: []
      },
      users: {
        totalUsers: 0,
        activeUsers: 0,
        avgQueriesPerUser: 0,
        userSegments: [],
        sessionAnalytics: {
          avgSessionLength: 0,
          avgQueriesPerSession: 0,
          bounceRate: 0,
          conversionRate: 0,
          exitPages: []
        }
      },
      trends: {
        queryVolume: [],
        responseTime: [],
        errorRate: [],
        userActivity: [],
        contentGrowth: []
      }
    }
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const configFile = path.join(this.configPath, 'config.json')
      const data = await fs.readFile(configFile, 'utf-8')
      this.config = { ...this.config, ...JSON.parse(data) }
    } catch (error) {
      console.log('No existing configuration found, using defaults')
    }
  }

  private async setupDefaultIndices(): Promise<void> {
    const defaultIndex: SearchIndex = {
      name: 'transcriptions',
      settings: {
        shards: this.config.indexing.shards,
        replicas: this.config.indexing.replicas,
        refreshInterval: this.config.indexing.refreshInterval,
        compression: this.config.indexing.compression
      },
      mappings: {
        properties: this.config.engines[0].fields.reduce((acc, field) => {
          acc[field.name] = {
            type: field.type,
            index: field.indexed,
            store: field.stored,
            analyzer: field.analyzed ? this.config.engines[0].config.analyzer : undefined,
            boost: field.boost
          }
          return acc
        }, {} as any)
      },
      stats: {
        documents: 0,
        size: 0,
        lastUpdate: new Date()
      }
    }

    this.indices.set(defaultIndex.name, defaultIndex)
  }

  private async loadExistingDocuments(): Promise<void> {
    try {
      const documentsFile = path.join(this.dataPath, 'documents.json')
      const data = await fs.readFile(documentsFile, 'utf-8')
      const documents = JSON.parse(data)
      
      for (const doc of documents) {
        this.documents.set(doc.id, {
          ...doc,
          timestamp: new Date(doc.timestamp)
        })
      }
    } catch (error) {
      console.log('No existing documents found')
    }
  }

  private async buildIndices(): Promise<void> {
    // Build inverted index for full-text search
    this.invertedIndex.clear()
    
    for (const [docId, document] of this.documents) {
      const tokens = this.tokenizeDocument(document)
      
      for (const token of tokens) {
        if (!this.invertedIndex.has(token)) {
          this.invertedIndex.set(token, new Set())
        }
        this.invertedIndex.get(token)!.add(docId)
      }
    }

    this.emit('indicesBuilt', { documents: this.documents.size, terms: this.invertedIndex.size })
  }

  private tokenizeDocument(document: SearchDocument): string[] {
    const engine = this.config.engines[0]
    const tokens: string[] = []
    
    // Extract text from all analyzed fields
    for (const field of engine.fields) {
      if (field.analyzed && document.source[field.name]) {
        const fieldText = String(document.source[field.name])
        const fieldTokens = this.tokenize(fieldText, engine.config)
        tokens.push(...fieldTokens)
      }
    }
    
    return tokens
  }

  private tokenize(text: string, config: EngineConfig): string[] {
    // Basic tokenization - in production use proper analyzers
    let tokens = text.toLowerCase()
                    .replace(/[^\w\s]/g, ' ')
                    .split(/\s+/)
                    .filter(token => token.length > 0)

    // Remove stop words
    if (config.stopWords.length > 0) {
      tokens = tokens.filter(token => !config.stopWords.includes(token))
    }

    // Apply stemming (simplified)
    if (config.stemming) {
      tokens = tokens.map(token => this.stem(token))
    }

    // Generate n-grams
    if (config.nGrams.enabled) {
      const nGrams = this.generateNGrams(tokens, config.nGrams)
      if (config.nGrams.preserveOriginal) {
        tokens.push(...nGrams)
      } else {
        tokens = nGrams
      }
    }

    return tokens
  }

  private stem(word: string): string {
    // Simplified stemming - in production use proper stemmer
    if (word.endsWith('ing')) {
      return word.slice(0, -3)
    }
    if (word.endsWith('ed')) {
      return word.slice(0, -2)
    }
    if (word.endsWith('s') && word.length > 3) {
      return word.slice(0, -1)
    }
    return word
  }

  private generateNGrams(tokens: string[], config: NGramConfig): string[] {
    const nGrams: string[] = []
    
    for (let i = 0; i < tokens.length; i++) {
      for (let n = config.minGram; n <= config.maxGram; n++) {
        if (i + n <= tokens.length) {
          const nGram = tokens.slice(i, i + n).join(' ')
          nGrams.push(nGram)
        }
      }
    }
    
    return nGrams
  }

  async indexDocument(document: Omit<SearchDocument, 'id' | 'timestamp' | 'version'>): Promise<string> {
    const docId = crypto.randomUUID()
    const searchDoc: SearchDocument = {
      id: docId,
      timestamp: new Date(),
      version: 1,
      metadata: {},
      ...document
    }

    this.documents.set(docId, searchDoc)

    // Update inverted index
    const tokens = this.tokenizeDocument(searchDoc)
    for (const token of tokens) {
      if (!this.invertedIndex.has(token)) {
        this.invertedIndex.set(token, new Set())
      }
      this.invertedIndex.get(token)!.add(docId)
    }

    // Update index stats
    const index = this.indices.get(searchDoc.index)
    if (index) {
      index.stats.documents++
      index.stats.lastUpdate = new Date()
    }

    // Save documents
    await this.saveDocuments()

    this.emit('documentIndexed', { documentId: docId, index: searchDoc.index })
    return docId
  }

  async search(query: Omit<SearchQuery, 'id'>): Promise<SearchResult> {
    const queryId = crypto.randomUUID()
    const searchQuery: SearchQuery = {
      id: queryId,
      ...query
    }

    this.queries.set(queryId, searchQuery)
    const startTime = Date.now()

    try {
      // Track query
      this.analytics.queries.total++
      this.trackQuery(searchQuery)

      // Execute search
      const result = await this.executeSearch(searchQuery)
      const took = Date.now() - startTime

      result.queryId = queryId
      result.took = took

      // Update analytics
      this.analytics.queries.successful++
      this.analytics.queries.avgResponseTime = (this.analytics.queries.avgResponseTime + took) / 2
      this.analytics.performance.avgResponseTime = this.analytics.queries.avgResponseTime

      this.emit('searchCompleted', { queryId, took, hits: result.totalHits })
      return result

    } catch (error) {
      this.analytics.queries.failed++
      this.analytics.performance.errors++
      
      this.emit('searchFailed', { queryId, error: error.message })
      throw error
    }
  }

  private async executeSearch(query: SearchQuery): Promise<SearchResult> {
    const engine = this.config.engines.find(e => e.enabled) || this.config.engines[0]
    const hits: SearchHit[] = []
    const aggregations: SearchAggregations = {}

    // Tokenize query
    const queryTokens = this.tokenize(query.text, engine.config)
    const expandedTokens = await this.expandQuery(queryTokens, engine)

    // Find matching documents
    const candidateDocIds = this.findCandidateDocuments(expandedTokens)
    
    // Score and rank documents
    const scoredDocs = await this.scoreDocuments(candidateDocIds, query, engine)
    
    // Apply filters
    const filteredDocs = this.applyFilters(scoredDocs, query.filters)
    
    // Apply sorting
    const sortedDocs = this.sortDocuments(filteredDocs, query.sort)
    
    // Apply pagination
    const paginatedDocs = this.paginateResults(sortedDocs, query.pagination)
    
    // Build search hits
    for (const { docId, score } of paginatedDocs) {
      const document = this.documents.get(docId)
      if (document) {
        const hit: SearchHit = {
          id: docId,
          index: document.index,
          score,
          source: document.source
        }

        // Add highlighting
        if (query.highlighting?.enabled) {
          hit.highlight = await this.generateHighlights(document, queryTokens, query.highlighting)
        }

        hits.push(hit)
      }
    }

    // Build aggregations
    if (query.facets.length > 0) {
      for (const facetName of query.facets) {
        const facetConfig = this.config.facets.facets.find(f => f.name === facetName)
        if (facetConfig) {
          aggregations[facetName] = await this.buildFacetAggregation(filteredDocs, facetConfig)
        }
      }
    }

    // Build suggestions
    const suggestions: SearchSuggestions = {}
    if (query.suggestions && this.config.suggestions.enabled) {
      suggestions.completion = await this.generateCompletionSuggestions(query.text)
      suggestions.spelling = await this.generateSpellingSuggestions(query.text)
    }

    return {
      id: crypto.randomUUID(),
      queryId: query.id,
      totalHits: filteredDocs.length,
      maxScore: hits.length > 0 ? Math.max(...hits.map(h => h.score)) : 0,
      took: 0, // Will be set by caller
      timedOut: false,
      hits,
      aggregations,
      suggest: suggestions
    }
  }

  private async expandQuery(tokens: string[], engine: SearchEngine): Promise<string[]> {
    const expandedTokens = [...tokens]
    
    // Synonym expansion
    if (engine.config.synonyms.enabled) {
      for (const token of tokens) {
        const synonyms = engine.config.synonyms.synonyms[token]
        if (synonyms) {
          expandedTokens.push(...synonyms)
        }
      }
    }

    // Phonetic expansion
    if (engine.config.phonetic.enabled) {
      for (const token of tokens) {
        const phoneticCode = this.generatePhoneticCode(token, engine.config.phonetic)
        // Find words with same phonetic code
        for (const [term] of this.invertedIndex) {
          if (this.generatePhoneticCode(term, engine.config.phonetic) === phoneticCode && term !== token) {
            expandedTokens.push(term)
          }
        }
      }
    }

    return [...new Set(expandedTokens)] // Remove duplicates
  }

  private generatePhoneticCode(word: string, config: PhoneticConfig): string {
    switch (config.algorithm) {
      case 'soundex':
        return this.soundex(word)
      case 'metaphone':
        return this.metaphone(word)
      default:
        return word
    }
  }

  private soundex(word: string): string {
    // Simplified soundex implementation
    if (!word) return '0000'
    
    word = word.toUpperCase()
    let result = word[0]
    
    const mapping: { [key: string]: string } = {
      'BFPV': '1',
      'CGJKQSXZ': '2',
      'DT': '3',
      'L': '4',
      'MN': '5',
      'R': '6'
    }
    
    for (let i = 1; i < word.length; i++) {
      for (const [letters, code] of Object.entries(mapping)) {
        if (letters.includes(word[i])) {
          if (result[result.length - 1] !== code) {
            result += code
          }
          break
        }
      }
    }
    
    return (result + '0000').substring(0, 4)
  }

  private metaphone(word: string): string {
    // Simplified metaphone implementation
    return word.toUpperCase().replace(/[AEIOU]/g, '').substring(0, 4)
  }

  private findCandidateDocuments(tokens: string[]): Set<string> {
    const candidateDocIds = new Set<string>()
    
    for (const token of tokens) {
      const docIds = this.invertedIndex.get(token)
      if (docIds) {
        for (const docId of docIds) {
          candidateDocIds.add(docId)
        }
      }
    }
    
    return candidateDocIds
  }

  private async scoreDocuments(
    candidateDocIds: Set<string>, 
    query: SearchQuery, 
    engine: SearchEngine
  ): Promise<{ docId: string; score: number }[]> {
    const scoredDocs: { docId: string; score: number }[] = []
    const queryTokens = this.tokenize(query.text, engine.config)
    
    for (const docId of candidateDocIds) {
      const document = this.documents.get(docId)
      if (!document) continue
      
      let score = 0
      
      // Calculate TF-IDF score for each field
      for (const field of engine.fields) {
        if (!field.analyzed || !document.source[field.name]) continue
        
        const fieldText = String(document.source[field.name])
        const fieldTokens = this.tokenize(fieldText, engine.config)
        const fieldScore = this.calculateTFIDF(queryTokens, fieldTokens, this.documents.size)
        
        score += fieldScore * field.boost
      }
      
      // Apply recency boost
      if (engine.boost.recency.enabled) {
        const recencyScore = this.calculateRecencyScore(document, engine.boost.recency)
        score *= recencyScore
      }
      
      // Apply relevance boosts
      if (engine.boost.relevance.enabled) {
        const relevanceBoost = this.calculateRelevanceBoost(document, query, engine.boost.relevance)
        score *= relevanceBoost
      }
      
      scoredDocs.push({ docId, score })
    }
    
    return scoredDocs.sort((a, b) => b.score - a.score)
  }

  private calculateTFIDF(queryTokens: string[], documentTokens: string[], totalDocuments: number): number {
    let score = 0
    
    for (const queryToken of queryTokens) {
      // Term frequency in document
      const tf = documentTokens.filter(token => token === queryToken).length / documentTokens.length
      
      // Inverse document frequency
      const documentsWithTerm = this.invertedIndex.get(queryToken)?.size || 0
      const idf = Math.log(totalDocuments / (documentsWithTerm + 1))
      
      score += tf * idf
    }
    
    return score
  }

  private calculateRecencyScore(document: SearchDocument, config: RecencyBoost): number {
    const now = Date.now()
    const docTime = document.timestamp.getTime()
    const ageMs = now - docTime
    
    // Convert scale to milliseconds
    const scaleMs = this.parseTimeString(config.scale)
    const offsetMs = this.parseTimeString(config.offset)
    
    if (ageMs < offsetMs) {
      return 1.0 // No decay within offset period
    }
    
    const adjustedAge = ageMs - offsetMs
    const decayFactor = Math.exp(-config.decay * (adjustedAge / scaleMs))
    
    return Math.max(0.1, decayFactor) // Minimum score of 0.1
  }

  private parseTimeString(timeStr: string): number {
    const match = timeStr.match(/(\d+)([dmhsy])/)
    if (!match) return 0
    
    const value = parseInt(match[1])
    const unit = match[2]
    
    switch (unit) {
      case 'd': return value * 24 * 60 * 60 * 1000
      case 'h': return value * 60 * 60 * 1000
      case 'm': return value * 60 * 1000
      case 's': return value * 1000
      case 'y': return value * 365 * 24 * 60 * 60 * 1000
      default: return 0
    }
  }

  private calculateRelevanceBoost(document: SearchDocument, query: SearchQuery, config: RelevanceBoost): number {
    let boost = 1.0
    const queryLower = query.text.toLowerCase()
    
    // Title boost
    if (document.source.title) {
      const title = String(document.source.title).toLowerCase()
      if (title.includes(queryLower)) {
        boost *= config.titleBoost
      }
      if (title === queryLower) {
        boost *= config.exactMatchBoost
      }
    }
    
    // Content boost
    if (document.source.content) {
      const content = String(document.source.content).toLowerCase()
      if (content.includes(queryLower)) {
        boost *= config.contentBoost
      }
    }
    
    // Tags boost
    if (document.source.tags && Array.isArray(document.source.tags)) {
      const tags = document.source.tags.map(tag => String(tag).toLowerCase())
      if (tags.some(tag => tag.includes(queryLower))) {
        boost *= config.tagsBoost
      }
    }
    
    return boost
  }

  private applyFilters(
    scoredDocs: { docId: string; score: number }[], 
    filters: QueryFilter[]
  ): { docId: string; score: number }[] {
    if (filters.length === 0) return scoredDocs
    
    return scoredDocs.filter(({ docId }) => {
      const document = this.documents.get(docId)
      if (!document) return false
      
      return filters.every(filter => this.evaluateFilter(document, filter))
    })
  }

  private evaluateFilter(document: SearchDocument, filter: QueryFilter): boolean {
    const fieldValue = document.source[filter.field]
    
    switch (filter.type) {
      case 'term':
        return fieldValue === filter.value
      case 'terms':
        return Array.isArray(filter.value) && filter.value.includes(fieldValue)
      case 'range':
        return this.evaluateRangeFilter(fieldValue, filter.value)
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null
      case 'prefix':
        return String(fieldValue).startsWith(String(filter.value))
      case 'wildcard':
        return this.matchWildcard(String(fieldValue), String(filter.value))
      case 'regexp':
        return new RegExp(String(filter.value)).test(String(fieldValue))
      default:
        return true
    }
  }

  private evaluateRangeFilter(fieldValue: any, rangeValue: any): boolean {
    if (typeof rangeValue !== 'object') return false
    
    const value = typeof fieldValue === 'string' ? parseFloat(fieldValue) : fieldValue
    
    if (rangeValue.gte !== undefined && value < rangeValue.gte) return false
    if (rangeValue.gt !== undefined && value <= rangeValue.gt) return false
    if (rangeValue.lte !== undefined && value > rangeValue.lte) return false
    if (rangeValue.lt !== undefined && value >= rangeValue.lt) return false
    
    return true
  }

  private matchWildcard(text: string, pattern: string): boolean {
    const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.')
    return new RegExp(`^${regexPattern}$`).test(text)
  }

  private sortDocuments(
    scoredDocs: { docId: string; score: number }[], 
    sortCriteria: SortCriteria[]
  ): { docId: string; score: number }[] {
    if (sortCriteria.length === 0) {
      return scoredDocs // Already sorted by score
    }
    
    return scoredDocs.sort((a, b) => {
      for (const criteria of sortCriteria) {
        const aDoc = this.documents.get(a.docId)
        const bDoc = this.documents.get(b.docId)
        
        if (!aDoc || !bDoc) continue
        
        let aValue: any
        let bValue: any
        
        if (criteria.field === '_score') {
          aValue = a.score
          bValue = b.score
        } else {
          aValue = aDoc.source[criteria.field]
          bValue = bDoc.source[criteria.field]
        }
        
        // Handle missing values
        if (aValue === undefined || aValue === null) {
          if (criteria.missing === '_first') return -1
          if (criteria.missing === '_last') return 1
          aValue = criteria.missing
        }
        
        if (bValue === undefined || bValue === null) {
          if (criteria.missing === '_first') return 1
          if (criteria.missing === '_last') return -1
          bValue = criteria.missing
        }
        
        // Compare values
        let comparison = 0
        if (aValue < bValue) comparison = -1
        else if (aValue > bValue) comparison = 1
        
        if (criteria.order === 'desc') comparison *= -1
        
        if (comparison !== 0) return comparison
      }
      
      return 0
    })
  }

  private paginateResults(
    sortedDocs: { docId: string; score: number }[], 
    pagination: Pagination
  ): { docId: string; score: number }[] {
    const start = pagination.from || 0
    const size = pagination.size || 10
    
    return sortedDocs.slice(start, start + size)
  }

  private async generateHighlights(
    document: SearchDocument, 
    queryTokens: string[], 
    config: HighlightingConfig
  ): Promise<{ [field: string]: string[] }> {
    const highlights: { [field: string]: string[] } = {}
    
    for (const fieldName of config.fields) {
      const fieldValue = document.source[fieldName]
      if (!fieldValue) continue
      
      const text = String(fieldValue)
      const fieldHighlights = this.highlightField(text, queryTokens, config)
      
      if (fieldHighlights.length > 0) {
        highlights[fieldName] = fieldHighlights
      }
    }
    
    return highlights
  }

  private highlightField(text: string, queryTokens: string[], config: HighlightingConfig): string[] {
    const fragments: string[] = []
    const fragmentSize = config.fragmentSize
    let currentPos = 0
    
    // Find all matches
    const matches: { start: number; end: number; token: string }[] = []
    
    for (const token of queryTokens) {
      const regex = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      let match
      
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          token: match[0]
        })
      }
    }
    
    // Sort matches by position
    matches.sort((a, b) => a.start - b.start)
    
    // Generate fragments around matches
    for (const match of matches.slice(0, config.numberOfFragments)) {
      const start = Math.max(0, match.start - Math.floor(fragmentSize / 2))
      const end = Math.min(text.length, start + fragmentSize)
      
      let fragment = text.substring(start, end)
      
      // Add highlighting tags
      const preTag = config.preTags[0] || '<em>'
      const postTag = config.postTags[0] || '</em>'
      
      for (const m of matches) {
        if (m.start >= start && m.end <= end) {
          const relativeStart = m.start - start
          const relativeEnd = m.end - start
          
          fragment = fragment.substring(0, relativeStart) +
                    preTag + m.token + postTag +
                    fragment.substring(relativeEnd)
        }
      }
      
      fragments.push(fragment)
    }
    
    return fragments
  }

  private async buildFacetAggregation(
    scoredDocs: { docId: string; score: number }[], 
    facetConfig: FacetDefinition
  ): Promise<SearchAggregation> {
    const buckets: AggregationBucket[] = []
    const fieldCounts: { [key: string]: number } = {}
    
    // Count field values
    for (const { docId } of scoredDocs) {
      const document = this.documents.get(docId)
      if (!document) continue
      
      let fieldValue = document.source[facetConfig.field]
      
      if (fieldValue === undefined || fieldValue === null) {
        fieldValue = facetConfig.missing
      }
      
      if (Array.isArray(fieldValue)) {
        for (const value of fieldValue) {
          const key = String(value)
          fieldCounts[key] = (fieldCounts[key] || 0) + 1
        }
      } else {
        const key = String(fieldValue)
        fieldCounts[key] = (fieldCounts[key] || 0) + 1
      }
    }
    
    // Filter and sort buckets
    let entries = Object.entries(fieldCounts)
      .filter(([key, count]) => count >= facetConfig.minDocCount)
      .filter(([key]) => {
        if (facetConfig.include.length > 0 && !facetConfig.include.includes(key)) return false
        if (facetConfig.exclude.length > 0 && facetConfig.exclude.includes(key)) return false
        return true
      })
    
    // Sort buckets
    if (facetConfig.order.type === '_count') {
      entries.sort(([, a], [, b]) => facetConfig.order.direction === 'desc' ? b - a : a - b)
    } else {
      entries.sort(([a], [b]) => facetConfig.order.direction === 'desc' ? b.localeCompare(a) : a.localeCompare(b))
    }
    
    // Limit results
    entries = entries.slice(0, facetConfig.size)
    
    // Build buckets
    for (const [key, docCount] of entries) {
      buckets.push({
        key,
        docCount,
        keyAsString: key
      })
    }
    
    return {
      buckets,
      docCountErrorUpperBound: 0,
      sumOtherDocCount: Math.max(0, Object.values(fieldCounts).reduce((sum, count) => sum + count, 0) - 
                                    buckets.reduce((sum, bucket) => sum + bucket.docCount, 0))
    }
  }

  private async generateCompletionSuggestions(query: string): Promise<SuggestionResponse[]> {
    const suggestions: SuggestionResponse[] = []
    const config = this.config.suggestions.completion
    
    if (!config.enabled) return suggestions
    
    // Find matching documents by title prefix
    const queryLower = query.toLowerCase()
    const matches: { text: string; score: number }[] = []
    
    for (const document of this.documents.values()) {
      const title = document.source[config.field]
      if (!title) continue
      
      const titleStr = String(title).toLowerCase()
      if (titleStr.startsWith(queryLower)) {
        matches.push({
          text: String(title),
          score: 1.0 / (titleStr.length - queryLower.length + 1) // Prefer shorter matches
        })
      }
    }
    
    // Sort by score and limit
    matches.sort((a, b) => b.score - a.score)
    const topMatches = matches.slice(0, config.size)
    
    // Build suggestions
    for (const match of topMatches) {
      suggestions.push({
        text: query,
        offset: 0,
        length: query.length,
        options: [{
          text: match.text,
          score: match.score
        }]
      })
    }
    
    return suggestions
  }

  private async generateSpellingSuggestions(query: string): Promise<SuggestionResponse[]> {
    const suggestions: SuggestionResponse[] = []
    const config = this.config.suggestions.spelling
    
    if (!config.enabled) return suggestions
    
    const words = query.split(/\s+/)
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i].toLowerCase()
      const corrections = this.findSpellingCorrections(word, config)
      
      if (corrections.length > 0) {
        suggestions.push({
          text: word,
          offset: query.indexOf(word),
          length: word.length,
          options: corrections.map(correction => ({
            text: correction.word,
            score: correction.score,
            freq: correction.frequency
          }))
        })
      }
    }
    
    return suggestions
  }

  private findSpellingCorrections(word: string, config: SpellingConfig): { word: string; score: number; frequency: number }[] {
    const corrections: { word: string; score: number; frequency: number }[] = []
    
    // Check against all terms in inverted index
    for (const [term, docIds] of this.invertedIndex) {
      if (term === word) continue
      
      const distance = this.levenshteinDistance(word, term)
      const maxDistance = Math.min(config.maxEdits, Math.floor(word.length / 2))
      
      if (distance <= maxDistance && term.length >= config.minWordLength) {
        const similarity = 1 - (distance / Math.max(word.length, term.length))
        
        if (similarity >= config.accuracy) {
          corrections.push({
            word: term,
            score: similarity,
            frequency: docIds.size
          })
        }
      }
    }
    
    // Sort by score and frequency
    corrections.sort((a, b) => {
      if (Math.abs(a.score - b.score) < 0.01) {
        return b.frequency - a.frequency
      }
      return b.score - a.score
    })
    
    return corrections.slice(0, 5) // Limit to top 5 suggestions
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2[i - 1] === str1[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  private trackQuery(query: SearchQuery): void {
    // Track query length distribution
    const lengthRange = this.getQueryLengthRange(query.text.length)
    this.analytics.queries.queryDistribution.byLength[lengthRange] = 
      (this.analytics.queries.queryDistribution.byLength[lengthRange] || 0) + 1
    
    // Track query by time
    const hour = new Date().getHours().toString()
    this.analytics.queries.queryDistribution.byTime[hour] = 
      (this.analytics.queries.queryDistribution.byTime[hour] || 0) + 1
    
    // Update popular queries
    const existingQuery = this.analytics.queries.popularQueries.find(pq => pq.query === query.text)
    if (existingQuery) {
      existingQuery.count++
      existingQuery.lastSeen = new Date()
    } else {
      this.analytics.queries.popularQueries.push({
        query: query.text,
        count: 1,
        avgScore: 0,
        clickThrough: 0,
        lastSeen: new Date()
      })
    }
    
    // Keep only top 100 popular queries
    this.analytics.queries.popularQueries.sort((a, b) => b.count - a.count)
    this.analytics.queries.popularQueries = this.analytics.queries.popularQueries.slice(0, 100)
  }

  private getQueryLengthRange(length: number): string {
    if (length <= 10) return '1-10'
    if (length <= 20) return '11-20'
    if (length <= 50) return '21-50'
    return '50+'
  }

  private async startIndexingScheduler(): Promise<void> {
    if (this.config.indexing.mode === 'realtime') return // No scheduling needed for realtime
    
    this.indexingInterval = setInterval(async () => {
      try {
        await this.optimizeIndices()
      } catch (error) {
        console.error('Index optimization error:', error)
        this.emit('indexingError', error)
      }
    }, 3600000) // Every hour
  }

  private async optimizeIndices(): Promise<void> {
    if (!this.config.indexing.optimization.enabled) return
    
    // Rebuild inverted index for better performance
    await this.buildIndices()
    
    // Cleanup old queries
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    
    for (const [queryId, query] of this.queries) {
      // Assuming queries have a timestamp field
      if (now - new Date(query.id).getTime() > maxAge) {
        this.queries.delete(queryId)
      }
    }
    
    this.emit('indicesOptimized', { 
      documents: this.documents.size, 
      terms: this.invertedIndex.size,
      queries: this.queries.size 
    })
  }

  private async startAnalyticsCollection(): Promise<void> {
    this.analyticsInterval = setInterval(() => {
      try {
        this.updateAnalytics()
      } catch (error) {
        console.error('Analytics collection error:', error)
      }
    }, 60000) // Every minute
  }

  private updateAnalytics(): void {
    // Update performance metrics
    const now = new Date()
    this.analytics.performance.throughput = this.analytics.queries.total / Math.max(1, now.getTime() / 60000)
    
    // Update trend data
    const trendData: TrendData = {
      timestamp: now,
      value: this.analytics.queries.total,
      change: 0, // Calculate change from previous period
      period: 'hour'
    }
    
    this.analytics.trends.queryVolume.push(trendData)
    
    // Keep only last 24 hours of trend data
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    this.analytics.trends.queryVolume = this.analytics.trends.queryVolume.filter(td => td.timestamp > cutoff)
    
    this.emit('analyticsUpdated', this.analytics)
  }

  private async startOptimization(): Promise<void> {
    this.optimizationInterval = setInterval(async () => {
      try {
        await this.performOptimization()
      } catch (error) {
        console.error('Optimization error:', error)
      }
    }, 24 * 60 * 60 * 1000) // Daily
  }

  private async performOptimization(): Promise<void> {
    // Clean up analytics data
    const retention = this.config.analytics.retention * 24 * 60 * 60 * 1000
    const cutoff = new Date(Date.now() - retention)
    
    // Clean trend data
    for (const [key, trends] of Object.entries(this.analytics.trends)) {
      this.analytics.trends[key as keyof TrendAnalytics] = trends.filter(td => td.timestamp > cutoff)
    }
    
    this.emit('optimizationCompleted')
  }

  private async saveDocuments(): Promise<void> {
    const documentsFile = path.join(this.dataPath, 'documents.json')
    const documents = Array.from(this.documents.values())
    await fs.writeFile(documentsFile, JSON.stringify(documents, null, 2))
  }

  async deleteDocument(documentId: string): Promise<boolean> {
    const document = this.documents.get(documentId)
    if (!document) return false
    
    // Remove from inverted index
    const tokens = this.tokenizeDocument(document)
    for (const token of tokens) {
      const docIds = this.invertedIndex.get(token)
      if (docIds) {
        docIds.delete(documentId)
        if (docIds.size === 0) {
          this.invertedIndex.delete(token)
        }
      }
    }
    
    // Remove document
    this.documents.delete(documentId)
    
    // Update index stats
    const index = this.indices.get(document.index)
    if (index) {
      index.stats.documents = Math.max(0, index.stats.documents - 1)
      index.stats.lastUpdate = new Date()
    }
    
    await this.saveDocuments()
    
    this.emit('documentDeleted', { documentId, index: document.index })
    return true
  }

  async getDocument(documentId: string): Promise<SearchDocument | undefined> {
    return this.documents.get(documentId)
  }

  async getIndexStats(indexName: string): Promise<IndexStats | undefined> {
    const index = this.indices.get(indexName)
    if (!index) return undefined
    
    return {
      name: indexName,
      health: 'green',
      status: 'open',
      uuid: crypto.randomUUID(),
      primaryShards: 1,
      replicaShards: 0,
      totalShards: 1,
      documents: {
        count: index.stats.documents,
        deleted: 0,
        size: index.stats.size
      },
      storage: {
        total: index.stats.size,
        primarySize: index.stats.size,
        replicaSize: 0,
        compressed: Math.floor(index.stats.size * 0.7)
      },
      performance: {
        indexing: { total: 0, time: 0, current: 0, failed: 0, rate: 0, avgTime: 0 },
        search: { total: this.analytics.queries.total, time: this.analytics.queries.avgResponseTime, current: 0, failed: this.analytics.queries.failed, rate: this.analytics.performance.throughput, avgTime: this.analytics.queries.avgResponseTime },
        get: { total: 0, time: 0, current: 0, failed: 0, rate: 0, avgTime: 0 },
        merge: { total: 0, time: 0, current: 0, failed: 0, rate: 0, avgTime: 0 },
        refresh: { total: 0, time: 0, current: 0, failed: 0, rate: 0, avgTime: 0 },
        flush: { total: 0, time: 0, current: 0, failed: 0, rate: 0, avgTime: 0 }
      }
    }
  }

  async getAnalytics(): Promise<SearchAnalytics> {
    return JSON.parse(JSON.stringify(this.analytics))
  }

  async getConfiguration(): Promise<SearchConfig> {
    return JSON.parse(JSON.stringify(this.config))
  }

  async updateConfiguration(config: Partial<SearchConfig>): Promise<void> {
    this.config = { ...this.config, ...config }
    await this.saveConfiguration()
    this.emit('configurationUpdated', this.config)
  }

  private async saveConfiguration(): Promise<void> {
    const configFile = path.join(this.configPath, 'config.json')
    await fs.writeFile(configFile, JSON.stringify(this.config, null, 2))
  }

  async destroy(): Promise<void> {
    if (this.indexingInterval) {
      clearInterval(this.indexingInterval)
    }
    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval)
    }
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval)
    }
    
    this.removeAllListeners()
    this.isInitialized = false
  }

  get initialized(): boolean {
    return this.isInitialized
  }
}

interface SearchIndex {
  name: string
  settings: {
    shards: number
    replicas: number
    refreshInterval: string
    compression: boolean
  }
  mappings: {
    properties: { [field: string]: any }
  }
  stats: {
    documents: number
    size: number
    lastUpdate: Date
  }
}

export const advancedSearchService = new AdvancedSearchService()